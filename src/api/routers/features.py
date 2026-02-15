"""
Router para procesamiento de features
Integra con el script generate_features_with_tactics.py existente
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import uuid
import asyncio
import subprocess
import threading
from pathlib import Path
from datetime import datetime

# Importar utilidades existentes
import sys
sys.path.append(str(Path(__file__).parent.parent.parent))

router = APIRouter(prefix="/api/features", tags=["features"])

# Scripts existentes
GENERATE_FEATURES_SCRIPT = Path(__file__).parent.parent.parent / "scripts" / "generate_features_with_tactics.py"

# Modelos Pydantic para request bodies
class FeatureExtractionRequest(BaseModel):
    batch_id: Optional[str] = None
    source: Optional[str] = None
    since_minutes: Optional[int] = None
    max_games: int = 1000
    workers: int = 4

# Estado de jobs (en producción esto sería una base de datos)
feature_jobs = {}

# Almacén temporal de notificaciones (en producción esto sería una base de datos)
notifications_store = {}

@router.post("/extract")
async def start_feature_extraction(
    request: FeatureExtractionRequest,
    background_tasks: BackgroundTasks
):
    """
    Iniciar extracción de features usando generate_features_with_tactics.py
    
    Args:
        request: Request body con parámetros de extracción
    
    Returns:
        Job ID para monitorear el progreso
    """
    # Validación: Requiere batch_id o since_minutes
    if request.batch_id is None and request.since_minutes is None:
        raise HTTPException(
            status_code=400, 
            detail="Debe proporcionar 'batch_id' o 'since_minutes' para procesar partidas específicas"
        )
    
    try:
        # Generar ID para el job
        job_id = str(uuid.uuid4())
        
        # Crear registro del job
        feature_jobs[job_id] = {
            "id": job_id,
            "batch_id": request.batch_id,
            "source": request.source,
            "since_minutes": request.since_minutes,
            "max_games": request.max_games,
            "workers": request.workers,
            "status": "queued",
            "started_at": datetime.now().isoformat(),
            "processed_games": 0,
            "total_games": 0,
            "progress": 0,
            "error": None
        }
        
        # Crear notificación inicial
        notification_id = str(uuid.uuid4())
        filter_desc = f"batch {request.batch_id}" if request.batch_id else f"últimos {request.since_minutes} min"
        notifications_store[notification_id] = {
            "id": notification_id,
            "type": "processing",
            "status": "processing",
            "title": "Extracción de Features Iniciada",
            "message": f"Procesando {filter_desc} - {request.source or 'todas las fuentes'}",
            "timestamp": datetime.now().isoformat(),
            "read": False,
            "metadata": {
                "job_id": job_id,
                "batch_id": request.batch_id,
                "source": request.source,
                "max_games": request.max_games
            }
        }
        
        # Iniciar procesamiento en background
        background_tasks.add_task(
            process_feature_extraction, 
            job_id,
            notification_id,
            request.batch_id,
            request.source, 
            request.since_minutes,
            request.max_games,
            request.workers
        )
        
        return JSONResponse({
            "jobId": job_id,
            "notificationId": notification_id,
            "status": "queued",
            "message": "Extracción de features iniciada en segundo plano",
            "batchId": request.batch_id,
            "source": request.source,
            "sinceMinutes": request.since_minutes,
            "maxGames": request.max_games,
            "workers": request.workers
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{job_id}")
async def get_feature_extraction_status(job_id: str):
    """
    Obtener estado de un job de extracción de features
    """
    if job_id not in feature_jobs:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    
    return JSONResponse(feature_jobs[job_id])

@router.get("/jobs")
async def list_feature_jobs():
    """
    Listar todos los jobs de extracción de features
    """
    return JSONResponse(list(feature_jobs.values()))

@router.get("/progress")
async def get_feature_extraction_progress():
    """
    Obtener progreso general de extracción de features
    """
    active_jobs = [job for job in feature_jobs.values() if job["status"] in ["running", "processing"]]
    completed_jobs = [job for job in feature_jobs.values() if job["status"] == "completed"]
    failed_jobs = [job for job in feature_jobs.values() if job["status"] == "failed"]
    
    if active_jobs:
        # Si hay jobs activos, retornar el progreso del más reciente
        latest_job = max(active_jobs, key=lambda x: x["created_at"])
        return JSONResponse({
            "is_processing": True,
            "progress": latest_job.get("progress", 0),
            "status": latest_job["status"],
            "job_id": latest_job["job_id"],
            "current_step": latest_job.get("current_step", "Processing..."),
            "total_jobs": len(feature_jobs),
            "active_jobs": len(active_jobs),
            "completed_jobs": len(completed_jobs),
            "failed_jobs": len(failed_jobs)
        })
    elif completed_jobs:
        # Si no hay activos pero sí completados, mostrar el último completado
        latest_completed = max(completed_jobs, key=lambda x: x["created_at"])
        return JSONResponse({
            "is_processing": False,
            "progress": 100,
            "status": "completed", 
            "job_id": latest_completed["job_id"],
            "current_step": "Extraction completed successfully",
            "total_jobs": len(feature_jobs),
            "active_jobs": len(active_jobs),
            "completed_jobs": len(completed_jobs),
            "failed_jobs": len(failed_jobs),
            "last_completed": latest_completed["completed_at"]
        })
    else:
        # No hay jobs o solo hay fallidos
        return JSONResponse({
            "is_processing": False,
            "progress": 0,
            "status": "idle",
            "job_id": None,
            "current_step": "No feature extraction in progress",
            "total_jobs": len(feature_jobs),
            "active_jobs": len(active_jobs),
            "completed_jobs": len(completed_jobs),
            "failed_jobs": len(failed_jobs)
        })

def _run_feature_extraction_sync(
    job_id: str,
    notification_id: str,
    batch_id: Optional[str],
    source: Optional[str],
    since_minutes: Optional[int],
    max_games: int,
    workers: int
):
    """
    Ejecutar extracción de features de forma síncrona en thread separado
    (Workaround para Windows donde asyncio.create_subprocess_exec no funciona con uvicorn --reload)
    """
    try:
        # Actualizar estado a processing
        feature_jobs[job_id]["status"] = "processing"
        
        # Construir comando usando sys.executable para usar el Python actual
        cmd = [
            sys.executable,
            str(GENERATE_FEATURES_SCRIPT),
            "--max-games", str(max_games),
            "--workers", str(workers)
        ]
        
        if batch_id:
            cmd.extend(["--batch-id", batch_id])
        elif since_minutes:
            cmd.extend(["--since-minutes", str(since_minutes)])
        
        if source:
            cmd.extend(["--source", source])
        
        # Log del comando para debug
        print(f"🚀 Ejecutando: {' '.join(cmd)}")
        
        # Ejecutar script usando subprocess.run (compatible con Windows)
        start_time = datetime.now()
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=str(GENERATE_FEATURES_SCRIPT.parent)
        )
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        # Log de output para debug
        stdout_text = result.stdout if result.stdout else ""
        stderr_text = result.stderr if result.stderr else ""
        
        if stdout_text:
            print(f"📝 STDOUT: {stdout_text[:1000]}")
        if stderr_text:
            print(f"❌ STDERR: {stderr_text[:1000]}")
        
        print(f"✅ Return code: {result.returncode}")
        
        if result.returncode == 0:
            # Éxito
            feature_jobs[job_id].update({
                "status": "completed",
                "completed_at": datetime.now().isoformat(),
                "duration_seconds": duration,
                "progress": 100
            })
            
            # Actualizar notificación
            notifications_store[notification_id].update({
                "type": "success",
                "status": "completed",
                "title": "Extracción de Features Completada",
                "message": f"Se procesaron {max_games} partidas exitosamente",
                "timestamp": datetime.now().isoformat(),
                "metadata": {
                    "job_id": job_id,
                    "source": source,
                    "games": max_games,
                    "duration": f"{duration:.1f}s"
                }
            })
            
        else:
            # Error
            error_msg = stderr_text if stderr_text else stdout_text if stdout_text else f"Código de salida: {result.returncode}"
            print(f"💥 PROCESO FALLÓ: {error_msg[:500]}")
            
            feature_jobs[job_id].update({
                "status": "failed",
                "completed_at": datetime.now().isoformat(),
                "duration_seconds": duration,
                "error": error_msg[:1000]
            })
            
            # Actualizar notificación
            notifications_store[notification_id].update({
                "type": "error",
                "status": "failed",
                "title": "Error en Extracción de Features",
                "message": f"El proceso falló con código {result.returncode}",
                "timestamp": datetime.now().isoformat(),
                "metadata": {
                    "job_id": job_id,
                    "error": error_msg[:500]
                }
            })
            
    except Exception as e:
        # Error inesperado
        import traceback
        error_trace = traceback.format_exc()
        print(f"💥 EXCEPCIÓN: {error_trace}")
        
        feature_jobs[job_id].update({
            "status": "failed",
            "completed_at": datetime.now().isoformat(),
            "error": f"{str(e)}\n{error_trace}"
        })
        
        notifications_store[notification_id].update({
            "type": "error",
            "status": "failed",
            "title": "Error en Extracción de Features",
            "message": f"Error inesperado: {str(e)}",
            "timestamp": datetime.now().isoformat(),
            "metadata": {
                "job_id": job_id,
                "error": str(e),
                "trace": error_trace[:500]
            }
        })

async def process_feature_extraction(
    job_id: str,
    notification_id: str,
    batch_id: Optional[str],
    source: Optional[str],
    since_minutes: Optional[int],
    max_games: int,
    workers: int
):
    """
    Wrapper async que ejecuta el procesamiento en un thread separado
    (Workaround para Windows donde asyncio.create_subprocess_exec no funciona con uvicorn --reload)
    """
    thread = threading.Thread(
        target=_run_feature_extraction_sync,
        args=(job_id, notification_id, batch_id, source, since_minutes, max_games, workers)
    )
    thread.start()

# Endpoints de notificaciones (simplificado)
@router.get("/notifications")
async def get_notifications():
    """
    Obtener todas las notificaciones
    """
    return JSONResponse(sorted(
        notifications_store.values(),
        key=lambda x: x["timestamp"],
        reverse=True
    ))

@router.get("/notifications/unread")
async def get_unread_notifications():
    """
    Obtener notificaciones no leídas
    """
    unread = [n for n in notifications_store.values() if not n["read"]]
    return JSONResponse(sorted(
        unread,
        key=lambda x: x["timestamp"],
        reverse=True
    ))

@router.put("/notifications/{notification_id}/read")
async def mark_notification_as_read(notification_id: str):
    """
    Marcar notificación como leída
    """
    if notification_id not in notifications_store:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    
    notifications_store[notification_id]["read"] = True
    return JSONResponse({"success": True})

@router.put("/notifications/read-all")
async def mark_all_notifications_as_read():
    """
    Marcar todas las notificaciones como leídas
    """
    for notification in notifications_store.values():
        notification["read"] = True
    return JSONResponse({"success": True})

@router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str):
    """
    Eliminar una notificación
    """
    if notification_id not in notifications_store:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    
    del notifications_store[notification_id]
    return JSONResponse({"success": True})

@router.delete("/notifications/clear-all")
async def clear_all_notifications():
    """
    Limpiar todas las notificaciones
    """
    notifications_store.clear()
    return JSONResponse({"success": True})
