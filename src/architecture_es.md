```mermaid
graph TD
  A[Archivos PGN<br>src/data/games/*.pgn] --> B[import_games.py]
  B --> DB[(Base de Datos SQLite<br>chess_trainer.db)]

  DB --> C[auto_tag_games.py]
  DB --> D[analyze_errors_from_games.py]
  DB --> E[generate_exercises_from_elite.py]
  DB --> F[generate_dataset.py]

  C --> M1[[modules/tagging.py]]
  D --> M2[[modules/stockfish_engine.py]]
  D --> M3[[modules/extractor.py]]
  E --> M4[[modules/export_utils.py]]
  F --> M2
  F --> M3

  G1[frontend React+Vite: elite_explorer] --> DB
  G2[frontend React+Vite: tag_games_ui] --> DB
  G3[frontend React+Vite: elite_training] --> DB
  G4[frontend React+Vite: summary_viewer] --> DB
  
  CSV[training_dataset.csv]
  G5[frontend React+Vite: eda] --> CSV

  F --> CSV
  CSV --> G5

  subgraph Frontend_React_Vite_Parcial
    G1
    G2
    G3
    G4
    G5
  end

  style A fill:#e1f5fe
  style DB fill:#f3e5f5
  style CSV fill:#fff3e0
```

# Arquitectura del Sistema ChessInsightAI

Este diagrama muestra el flujo de datos y la arquitectura del sistema chessinsightai.

## Componentes Principales

### 1. Entrada de Datos
- **Archivos PGN**: Archivos de partidas en formato estándar ubicados en `src/data/games/`

### 2. Base de Datos
- **SQLite**: Base de datos local `chess_trainer.db` que almacena todas las partidas procesadas

### 3. Scripts de Procesamiento
- **import_games.py**: Importa partidas desde archivos PGN a la base de datos
- **auto_tag_games.py**: Etiqueta automáticamente las partidas con metadatos
- **analyze_errors_from_games.py**: Analiza errores tácticos usando Stockfish
- **generate_exercises_from_elite.py**: Genera ejercicios de entrenamiento
- **generate_dataset.py**: Crea datasets para machine learning

### 4. Módulos de Soporte
- **modules/tagging.py**: Lógica de etiquetado automático
- **modules/stockfish_engine.py**: Interface con el motor Stockfish
- **modules/extractor.py**: Extracción de características de partidas
- **modules/export_utils.py**: Utilidades de exportación

### 5. Frontend Web (React+Vite, parcialmente desarrollado)
- **elite_explorer**: Exploración de partidas de élite
- **tag_games_ui**: Interface para etiquetar partidas
- **elite_training**: Entrenamiento con ejercicios
- **summary_viewer**: Visualización de resúmenes
- **eda**: Análisis exploratorio de datos
