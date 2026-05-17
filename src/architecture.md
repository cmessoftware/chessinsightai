```mermaid
graph TD
  A[PGN Files<br>src/data/games/*.pgn] --> B[import_games.py]
  B --> DB[(SQLite DB<br>chess_trainer.db)]

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

  API[Backend API / Service Layer]
  G1[frontend React+Vite: elite_explorer] --> API
  G2[frontend React+Vite: tag_games_ui] --> API
  G3[frontend React+Vite: elite_training] --> API
  G4[frontend React+Vite: summary_viewer] --> API
  
  CSV[training_dataset.csv]
  G5[frontend React+Vite: eda_viewer] --> API
  API --> DB
  API --> CSV

  F --> CSV
  CSV --> API

  subgraph React_Vite_Frontend
    G1
    G2
    G3
    G4
    G5
  end

  subgraph Scripts_Batch
    C
    D
    E
    F
  end
```

Note: the React+Vite frontend is partially developed; the diagram already models interaction through a backend API/service layer rather than direct database access.
