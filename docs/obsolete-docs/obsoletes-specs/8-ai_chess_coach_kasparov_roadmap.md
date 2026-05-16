---
OBSOLETE: true
OBSOLETE_DATE: 2026-04-24
OBSOLETE_REASON: Consolidado por módulos en docs/ai_chess_coach/2-architecture/modules/
CANONICAL_LOCATION: docs/ai_chess_coach/2-architecture/modules/
---

> [!WARNING]
> Documento obsoleto. No editar. Usar versión consolidada por módulo en docs/ai_chess_coach/2-architecture/modules/.
```mermaid
ChessTrainer Analysis System
│
├── [Kasparov-Inspired Analysis Module](9-ai_chess_coach_kasparov_inspired_functional.md)
│     (pipeline conceptual)
│
│     PGN
│      ↓
│     feature extraction
│      ↓
│     critical moment detection
│      ↓
│     candidate generation
│      ↓
│     engine evaluation
│      ↓
│     error classification
│      ↓
│     dataset generation
│
└── [Kasparov Decision Engine](10-ai_chess_coach_kasparov_technical_design.md)
      (implementación interna del pipeline)

      ├ Position Interpreter
      ├ Critical Moment Detector
      ├ Plan Inference Engine
      ├ Candidate Generator
      ├ Candidate Ranking Engine
      ├ Decision Classification Engine
      ├ Coach Narrative Engine
      └ Pattern Memory Engine`
```
