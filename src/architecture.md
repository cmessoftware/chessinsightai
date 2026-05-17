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

  G1[frontend React+Vite: elite_explorer] --> DB
  G2[frontend React+Vite: tag_games_ui] --> DB
  G3[frontend React+Vite: elite_training] --> DB
  G4[frontend React+Vite: summary_viewer] --> DB
  
  CSV[training_dataset.csv]
  G5[frontend React+Vite: eda] --> CSV

  F --> CSV
  CSV --> G5

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
