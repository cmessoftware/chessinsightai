# 🏗️ 00-Arquitectura General de ChessInsightAI

## Objetivo General
Comprender la arquitectura completa de **ChessInsightAI**: qué problema resuelve, cómo se organizan sus componentes, y cómo fluyen los datos desde un archivo PGN hasta una explicación pedagógica personalizada.

## ¿Qué problema resuelve?

Los motores de ajedrez (Stockfish) son excelentes evaluando posiciones, pero **no explican por qué una jugada es mala**. ChessInsightAI combina:

| Componente | Rol |
|------------|-----|
| **Stockfish** | Evaluación objetiva (*ground truth*) |
| **ML (RandomForest/GradientBoosting)** | Clasificación de errores: blunder, mistake, inaccuracy |
| **RAG** | Contexto de posiciones similares y libros de ajedrez |
| **LLM (Llama 3.1)** | Explicación en lenguaje natural adaptada al nivel del jugador |

> **Principio fundamental**: El LLM solo **EXPLICA**, nunca **DECIDE**. Las decisiones las toman Stockfish + ML.

## 📊 Diagrama de Arquitectura en Capas

La arquitectura de ChessInsightAI se organiza en **5 capas** principales, cada una con responsabilidades bien definidas:

```
┌─────────────────────────────────────────────────────────┐
│                 CAPA DE PRESENTACIÓN                    │
│         React (upload, stats, training)                 │
│              Puerto: 8501                               │
├─────────────────────────────────────────────────────────┤
│                   CAPA DE API                           │
│         FastAPI endpoints + Services                    │
│           (analysis, predictions)                       │
├─────────────────────────────────────────────────────────┤
│              CAPA DE ORQUESTACIÓN                       │
│      Planner → Executor → Critic → Memory               │
│         (Arquitectura Orquestada v2.0)                  │
├──────────────┬──────────────┬───────────────────────────┤
│   CAPA ML    │  CAPA RAG    │    CAPA ENGINE            │
│  RF/GB/SHAP  │  Embeddings  │    Stockfish              │
│  MLflow      │  Libros      │    Features               │
├──────────────┴──────────────┴───────────────────────────┤
│              CAPA DE DATOS                              │
│    PostgreSQL + Parquet datasets + PGN files            │
│              Puerto: 5432                               │
└─────────────────────────────────────────────────────────┘
```

**Principio clave**: Cada capa solo se comunica con las capas adyacentes. La capa de orquestación coordina todas las fuentes de evidencia.

## 🗂️ Estructura del Proyecto

El repositorio sigue una organización modular clara:

| Directorio | Contenido | Ejemplos |
|:-----------|:----------|:---------|
| `src/modules/` | Lógica core de ajedrez | `extractor.py`, `features_generator.py`, `pgn_utils.py` |
| `src/ml/` | Pipeline ML completo | `chess_error_predictor.py`, `shap_explainer.py` |
| `src/ai_coach/orchestrated/` | Arquitectura orquestada | `planner_service.py`, `executor_service.py`, `critic_service.py`, `memory_service.py` |
| `src/pages/` | Páginas Streamlit | `upload_pgn.py`, `elite_stats.py`, `tactics_viewer.py` |
| `notebooks/` | Análisis y entrenamiento | `ml_workflow_integrated.ipynb`, `course/` |
| `datasets/` | Datos de entrenamiento | `tactics/`, `studies/`, `models/` |
| `data/` | Datos de aplicación | `games/`, `chess_books/`, `vectorstore/` |
| `tests/` | Tests unitarios + integración | `tests/ai_coach/`, `tests/ml/`, `tests/modules/` |
| `docs/` | Documentación técnica | `ROADMAP.md`, guías de configuración |

### Servicios Docker

```yaml
services:
  chess_trainer:  # App Streamlit          → puerto 8501
  notebooks:     # Jupyter Lab             → puerto 8889
  postgres:      # Base de datos           → puerto 5432
  mlflow:        # Tracking de experimentos → puerto 5000
```

## ♟️ Pipeline de Procesamiento de Partidas (ETL)

El flujo de datos sigue un pipeline ETL clásico adaptado al dominio del ajedrez:

```
PGN File → Parser → Moves + FEN → Stockfish Analysis → Feature Extraction → ML Classification
```

### Paso 1: Parsing PGN
Se utiliza la librería `python-chess` para parsear archivos PGN (Portable Game Notation). Cada partida se descompone en:
- **Metadatos**: jugadores, ELO, apertura, resultado, fecha
- **Movimientos**: secuencia de jugadas con notación algebraica
- **Posiciones FEN**: estado del tablero después de cada jugada

### Paso 2: Análisis con Stockfish
Para cada posición, Stockfish calcula:
- **Evaluación** (centipawns): diferencia de ventaja material+posicional
- **Mejor jugada**: el movimiento óptimo según el motor
- **Profundidad**: niveles de búsqueda del árbol de juego

### Paso 3: Extracción de Features
El módulo `features_generator.py` extrae **16 características** de cada posición:

| Feature | Tipo | Descripción |
|:--------|:-----|:------------|
| `score_diff` | float | Cambio en evaluación del motor |
| `material_balance` | int | Diferencia de material (blancas - negras) |
| `num_pieces` | int | Total de piezas en el tablero |
| `branching_factor` | int | Movimientos legales disponibles |
| `self_mobility` | int | Movilidad del jugador activo |
| `opponent_mobility` | int | Movilidad del oponente |
| `is_center_controlled` | bool | Control de casillas centrales |
| `has_castling_rights` | bool | Derechos de enroque disponibles |
| `threatens_mate` | bool | Si hay amenaza de mate |
| `is_pawn_endgame` | bool | Solo peones y reyes |

## 🤖 Pipeline de Machine Learning

### Clasificación de Errores
El modelo de ML clasifica cada jugada en una de **4 categorías** basándose en la pérdida de evaluación del motor:

| Clasificación | score_diff (cp) | Descripción |
|:--------------|:----------------|:------------|
| **Good** | 0 – 30 | Jugada correcta o casi óptima |
| **Inaccuracy** | 30 – 80 | Imprecisión menor, pierde ventaja |
| **Mistake** | 80 – 200 | Error significativo, cambia la evaluación |
| **Blunder** | > 200 | Error grave, pierde material o la partida |

### Modelos Utilizados
- **RandomForestClassifier**: Modelo principal para clasificación
- **GradientBoostingClassifier**: Modelo alternativo con mejor rendimiento en datos desbalanceados
- **SHAP**: Explainability — identifica qué features influyen más en cada predicción

### Tracking con MLflow
Todos los experimentos se registran en **MLflow** (puerto 5000):
- Hiperparámetros del modelo
- Métricas (accuracy, precision, recall, F1)
- Artefactos (modelo serializado, gráficos SHAP)

