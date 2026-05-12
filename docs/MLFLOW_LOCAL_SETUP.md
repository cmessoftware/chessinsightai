# 🔧 MLflow Local Setup - Sin Docker

## 📋 Problema Actual

Docker Desktop está teniendo problemas de compatibilidad de API. Mientras lo solucionamos, podemos ejecutar MLflow directamente en tu sistema local.

## 🚀 Instalación Local Rápida

### 1. Instalar MLflow
```powershell
# En PowerShell como administrador:
pip install mlflow psycopg2-binary pandas scikit-learn matplotlib seaborn
```

### 2. Crear directorio para experimentos
```powershell
# En tu directorio chessinsightai:
mkdir mlruns
```

### 3. Iniciar MLflow Server Local
```powershell
# Desde c:\Users\sergiosal\source\repos\chessinsightai:
mlflow server --host 127.0.0.1 --port 5000 --backend-store-uri sqlite:///mlflow.db --default-artifact-root ./mlruns
```

### 4. Acceder a MLflow UI
- **URL**: http://127.0.0.1:5000
- Debería funcionar inmediatamente

## 🐍 Ejecutar Scripts de Entrenamiento

### Configuración Local Python
```powershell
# En el directorio del proyecto:
pip install -r requirements.txt

# Ejecutar configuración:
python src/scripts/setup_mlflow.py

# Entrenar modelos:
python src/ml/train_error_model.py
```

## 🔄 Alternativa: Script PowerShell para MLflow

Crear un archivo `start_mlflow_local.ps1`:

```powershell
# start_mlflow_local.ps1
Write-Host "🚀 Iniciando MLflow local..." -ForegroundColor Green

# Verificar si MLflow está instalado
if (-not (Get-Command mlflow -ErrorAction SilentlyContinue)) {
    Write-Host "❌ MLflow no está instalado. Instalando..." -ForegroundColor Red
    pip install mlflow psycopg2-binary pandas scikit-learn matplotlib seaborn
}

# Crear directorio mlruns si no existe
if (-not (Test-Path "mlruns")) {
    New-Item -ItemType Directory -Name "mlruns"
    Write-Host "📁 Directorio mlruns creado" -ForegroundColor Yellow
}

# Iniciar MLflow server
Write-Host "🌐 Iniciando MLflow en http://127.0.0.1:5000..." -ForegroundColor Cyan
mlflow server --host 127.0.0.1 --port 5000 --backend-store-uri sqlite:///mlflow.db --default-artifact-root ./mlruns

# Abrir browser automáticamente
Start-Process "http://127.0.0.1:5000"
```

## 🐳 Solución Docker (Para más tarde)

### Problema identificado:
- Docker Desktop versión 28.1.1 tiene incompatibilidades de API
- Error: `API version http://.../v1.49/... not supported`

### Soluciones a probar:
1. **Reiniciar Docker Desktop**: Cerrar completamente y reiniciar
2. **Actualizar Docker Desktop**: Descargar versión más reciente
3. **Usar Docker Compose v1**: `docker-compose --version` debe ser compatible
4. **Variables de entorno**: Configurar `DOCKER_API_VERSION=1.41`

### Comando de diagnóstico Docker:
```powershell
# Verificar información de Docker
docker info
docker version --format '{{.Server.APIVersion}}'
```

## ✅ Plan de Acción Inmediato

### Opción A: MLflow Local (Recomendado ahora)
1. Instalar MLflow: `pip install mlflow pandas scikit-learn`
2. Ejecutar: `mlflow server --host 127.0.0.1 --port 5000 --backend-store-uri sqlite:///mlflow.db --default-artifact-root ./mlruns`
3. Abrir: http://127.0.0.1:5000
4. Ejecutar scripts de entrenamiento

### Opción B: Solucionar Docker
1. Reiniciar Docker Desktop
2. Verificar versión y compatibilidad
3. Configurar variables de entorno si es necesario
4. Retomar configuración Docker

## 🎯 Beneficios del Setup Local

- ✅ **Más rápido**: Sin overhead de Docker
- ✅ **Menos recursos**: Usa directamente tu Python local
- ✅ **Fácil debug**: Acceso directo a archivos y logs
- ✅ **Funcional inmediato**: No depende de Docker

¿Quieres que procedamos con la instalación local de MLflow mientras solucionamos Docker?
