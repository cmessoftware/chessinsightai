# Fase 0 - Diagramas de Arquitectura

**Fecha:** Marzo 25, 2026  
**Versión:** 1.0  
**Estado:** En Desarrollo  
**Issue:** [#85](https://github.com/cmessoftware/chess_trainer/issues/85)

---

## Objetivo

Visualizar la Arquitectura Orquestada mediante diagramas técnicos que faciliten la comprensión del sistema y la implementación de las siguientes fases.

**Tipos de diagramas:**
1. Diagrama de Componentes (Alto nivel)
2. Diagrama de Secuencia (Flujo AnalyzeGameUseCase)
3. Diagrama de Flujo de Datos
4. Diagrama de Base de Datos
5. Diagrama de Despliegue

---

## 1. Diagrama de Componentes (Alto Nivel)

```mermaid
graph TB
    subgraph "External Layer"
        API[FastAPI Endpoints]
        Frontend[React Frontend]
    end
    
    subgraph "Use Cases Layer"
        UseCase[AnalyzeGameUseCase]
    end
    
    subgraph "Core Services Layer"
        Planner[Planner Service<br/>Decide QUÉ analizar]
        Executor[Executor Service<br/>Produce EVIDENCIA]
        Critic[Critic Service<br/>Valida COHERENCIA]
        Explainer[Explainer Service<br/>LLM EXPLICA]
        Memory[Memory Service<br/>Persistencia + Patrones]
    end
    
    subgraph "Infrastructure Layer"
        Engine[Stockfish Engine]
        ML[ML Models<br/>RandomForest/XGBoost]
        RAG[Chess RAG<br/>ChromaDB]
        CV[Computer Vision<br/>FEN Extraction]
        LLM[LLM Local<br/>Llama 3.1:8b]
        DB[(PostgreSQL)]
    end
    
    %% External connections
    Frontend -->|HTTP| API
    API -->|Call| UseCase
    
    %% Use Case orchestration
    UseCase -->|1. Plan| Planner
    UseCase -->|2. Execute| Executor
    UseCase -->|3. Validate| Critic
    UseCase -->|4. Generate| Explainer
    UseCase -->|5. Store| Memory
    
    %% Service dependencies
    Planner -.->|Read Options| DB
    
    Executor -->|Engine Analysis| Engine
    Executor -->|Extract Features| ML
    Executor -->|Retrieve Context| RAG
    Executor -->|Optional| CV
    
    Critic -.->|Validation Rules| Critic
    
    Explainer -->|Prompt| LLM
    
    Memory -->|Store/Retrieve| DB
    Memory -.->|Update Patterns| DB
    
    %% Styling
    classDef usecase fill:#e1f5ff,stroke:#01579b,stroke-width:3px
    classDef service fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef infra fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef external fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    
    class UseCase usecase
    class Planner,Executor,Critic,Explainer,Memory service
    class Engine,ML,RAG,CV,LLM,DB infra
    class API,Frontend external
```

**Leyenda:**
- **Sólido (→):** Dependencia directa / flujo de datos
- **Punteado (-.->):** Consulta / lectura sin modificación
- **Colores:**
  - 🔵 Azul: Use Cases
  - 🟠 Naranja: Servicios Core
  - 🟣 Púrpura: Infraestructura
  - 🟢 Verde: External Layer

---

## 2. Diagrama de Secuencia (AnalyzeGameUseCase)

```mermaid
sequenceDiagram
    actor User
    participant API as FastAPI
    participant UC as AnalyzeGameUseCase
    participant Planner
    participant Executor
    participant Engine as Stockfish
    participant ML as ML Models
    participant RAG as Chess RAG
    participant Critic
    participant Explainer as Explainer (LLM)
    participant Memory
    participant DB as PostgreSQL
    
    User->>API: POST /api/analysis/{game_id}
    activate API
    API->>UC: execute(game, options)
    activate UC
    
    %% FASE 1: PLANIFICACIÓN
    UC->>Planner: build_plan(game, options)
    activate Planner
    Planner->>Planner: identify_critical_moments()
    Planner->>Planner: prioritize_moves()
    Planner-->>UC: AnalysisPlan
    deactivate Planner
    
    Note over UC: Plan: 15 jugadas críticas<br/>Modos: engine, ml, rag
    
    %% FASE 2: EJECUCIÓN (por cada jugada)
    loop For each target move
        UC->>Executor: execute(game, plan)
        activate Executor
        
        %% Análisis Engine
        Executor->>Engine: analyze_position(fen, depth=20)
        activate Engine
        Engine-->>Executor: eval, best_move, line
        deactivate Engine
        
        %% Features + ML (paralelo)
        par ML Prediction
            Executor->>ML: predict_error(features)
            activate ML
            ML-->>Executor: MLPrediction
            deactivate ML
        and RAG Retrieval
            Executor->>RAG: retrieve_context(fen)
            activate RAG
            RAG-->>Executor: RAGContext
            deactivate RAG
        end
        
        Executor-->>UC: ExecutionResult
        deactivate Executor
        
        %% FASE 3: EXPLICACIÓN
        UC->>Explainer: generate(exec_result, elo)
        activate Explainer
        Explainer->>Explainer: build_prompt(result)
        Explainer->>Explainer: LLM.generate()
        Explainer-->>UC: explanation (text)
        deactivate Explainer
        
        %% FASE 4: CRÍTICA
        UC->>Critic: validate(exec_result, explanation)
        activate Critic
        Critic->>Critic: apply_rules()
        
        alt is_consistent = FALSE
            Critic-->>UC: CriticResult (issues)
            UC->>Explainer: generate_restricted(exec_result)
            activate Explainer
            Explainer-->>UC: fallback_explanation
            deactivate Explainer
        else is_consistent = TRUE
            Critic-->>UC: CriticResult (OK)
        end
        deactivate Critic
        
        %% FASE 5: PERSISTENCIA
        UC->>Memory: store_move_analysis(game_id, enriched)
        activate Memory
        Memory->>DB: INSERT move_analyses
        Memory->>DB: INSERT moves (dual write)
        deactivate Memory
        
    end
    
    %% FASE 6: ACTUALIZAR PATRONES
    UC->>Memory: update_player_patterns(player_id)
    activate Memory
    Memory->>DB: UPDATE player_patterns
    deactivate Memory
    
    %% RESPUESTA
    UC-->>API: AnalysisReport
    deactivate UC
    API-->>User: JSON response
    deactivate API
```

---

## 3. Diagrama de Flujo de Datos (Data Flow)

```mermaid
graph LR
    subgraph Input
        Game[Game<br/>PGN + Metadata]
        Options[AnalysisOptions<br/>depth, modes, ELO]
    end
    
    subgraph "Planner"
        P1[Identify Critical<br/>Moments]
        P2[Prioritize Moves]
        P3[Define Modes]
    end
    
    subgraph "Executor"
        E1[Engine Analysis]
        E2[Feature Extraction]
        E3[ML Prediction]
        E4[RAG Retrieval]
    end
    
    subgraph "Critic"
        C1[Apply Validation<br/>Rules]
        C2[Check Consistency]
        C3[Generate Issues]
    end
    
    subgraph "Explainer"
        X1[Build Prompt]
        X2[LLM Generate]
        X3[Adapt to ELO]
    end
    
    subgraph Output
        Report[AnalysisReport<br/>EnrichedResults]
        DB1[(move_analyses)]
        DB2[(player_patterns)]
    end
    
    %% Flow
    Game --> P1
    Options --> P1
    P1 --> P2
    P2 --> P3
    P3 -->|AnalysisPlan| E1
    
    E1 -->|Engine Data| E2
    E2 -->|Features| E3
    E1 -.->|Position| E4
    
    E3 -->|ExecutionResult| C1
    E4 -->|ExecutionResult| C1
    
    C1 --> C2
    C2 --> C3
    
    E3 -->|ExecutionResult| X1
    X1 --> X2
    Options -.->|ELO| X3
    X2 --> X3
    
    C3 -->|CriticResult| Report
    X3 -->|Explanation| Report
    
    Report --> DB1
    Report --> DB2
    
    %% Styling
    classDef input fill:#e8f5e9,stroke:#2e7d32
    classDef process fill:#fff3e0,stroke:#e65100
    classDef output fill:#e1f5ff,stroke:#01579b
    
    class Game,Options input
    class P1,P2,P3,E1,E2,E3,E4,C1,C2,C3,X1,X2,X3 process
    class Report,DB1,DB2 output
```

---

## 4. Diagrama de Base de Datos (Schema v2.0)

```mermaid
erDiagram
    users ||--o{ games : "plays"
    users ||--o{ move_analyses : "has"
    users ||--|| player_patterns : "has"
    
    games ||--o{ moves : "contains (legacy)"
    games ||--o{ move_analyses : "contains (v2.0)"
    games ||--o{ analysis_plans : "has"
    
    users {
        int id PK
        string email UK
        string hashed_password
        int elo
        timestamp created_at
    }
    
    games {
        uuid id PK
        int user_id FK
        text pgn
        string result
        string player_color
        string opponent_name
        date date_played
        timestamp uploaded_at
        boolean analyzed
    }
    
    moves {
        int id PK
        uuid game_id FK
        int ply
        string move_san
        text fen_before
        text fen_after
        float evaluation
        string best_move
        text explanation
        string tactical_theme
        string error_label
        timestamp created_at
    }
    
    move_analyses {
        int id PK
        uuid game_id FK
        int player_id FK
        int ply
        string move_san
        text fen_before
        text fen_after
        float engine_eval_before
        float engine_eval_after
        float score_diff
        string best_move
        array best_line
        jsonb features
        array tactical_tags
        string phase
        string ml_predicted_error
        float ml_confidence
        float ml_risk_score
        jsonb ml_contributing_features
        jsonb rag_similar_positions
        array rag_book_excerpts
        int rag_total_retrieved
        array rag_relevance_scores
        text explanation
        boolean is_consistent
        float critic_confidence
        jsonb critic_issues
        array critic_passed_rules
        array critic_failed_rules
        timestamp created_at
        float execution_time
        string version
    }
    
    player_patterns {
        int id PK
        int player_id FK "UK"
        int total_games_analyzed
        int total_moves_analyzed
        jsonb error_distribution
        jsonb frequent_tactics
        array weak_phases
        jsonb phase_error_rates
        float improvement_trend
        float recent_avg_error_rate
        jsonb error_clusters
        timestamp last_updated
        timestamp created_at
    }
    
    analysis_plans {
        int id PK
        uuid game_id FK
        int player_id FK
        array target_moves
        array analysis_modes
        jsonb priorities
        jsonb options
        jsonb metadata
        timestamp created_at
    }
```

**Relaciones Clave:**
- `users` → `games` (1:N)
- `users` → `move_analyses` (1:N)
- `users` ↔ `player_patterns` (1:1)
- `games` → `moves` (1:N, legacy)
- `games` → `move_analyses` (1:N, v2.0)

**Índices Importantes:**
- `move_analyses`: `(game_id, ply)`, `(player_id, created_at DESC)`, `(version)`
- `player_patterns`: `(player_id)` UNIQUE

---

## 5. Diagrama de Despliegue (Deployment)

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Browser<br/>React SPA]
    end
    
    subgraph "API Layer - Docker Container"
        API[FastAPI App<br/>Port 8000]
        Uvicorn[Uvicorn ASGI Server<br/>Workers: 4]
    end
    
    subgraph "Processing Layer - Docker Container"
        Notebooks[Jupyter Notebooks<br/>Port 8888]
        Stockfish[Stockfish Engine<br/>Binary]
        MLModels[ML Models<br/>pkl files]
    end
    
    subgraph "LLM Layer - Docker Container"
        Ollama[Ollama Server<br/>Port 11434]
        Llama[Llama 3.1:8b<br/>GGUF Model]
    end
    
    subgraph "Data Layer"
        PostgreSQL[(PostgreSQL<br/>Port 5432)]
        ChromaDB[(ChromaDB<br/>Port 8001)]
        MLflow[(MLflow<br/>Port 5000)]
    end
    
    subgraph "Storage"
        Volumes[Docker Volumes<br/>models, data, logs]
    end
    
    %% Connections
    Browser -->|HTTPS| API
    API --> Uvicorn
    
    Uvicorn -->|Analysis Request| Stockfish
    Uvicorn -->|ML Inference| MLModels
    Uvicorn -->|RAG Query| ChromaDB
    Uvicorn -->|LLM Prompt| Ollama
    Uvicorn -->|DB Query| PostgreSQL
    
    Ollama --> Llama
    
    Notebooks -.->|Training| MLModels
    Notebooks -.->|Logging| MLflow
    Notebooks -.->|RAG Index| ChromaDB
    
    API -.->|Read/Write| Volumes
    Notebooks -.->|Read/Write| Volumes
    
    %% Styling
    classDef client fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef api fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef processing fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef data fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef storage fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    
    class Browser client
    class API,Uvicorn api
    class Notebooks,Stockfish,MLModels,Ollama,Llama processing
    class PostgreSQL,ChromaDB,MLflow data
    class Volumes storage
```

**Puertos Expuestos:**
- `8000`: FastAPI (producción)
- `8888`: Jupyter Notebooks (desarrollo)
- `5432`: PostgreSQL
- `8001`: ChromaDB
- `5000`: MLflow
- `11434`: Ollama

---

## 6. Diagrama de Estados del Critic

```mermaid
stateDiagram-v2
    [*] --> Validating: ExecutionResult + Explanation
    
    Validating --> ApplyingRules: Start validation
    
    ApplyingRules --> BlunderThreshold: Rule 1
    ApplyingRules --> TacticalEvidence: Rule 2
    ApplyingRules --> EngineSupport: Rule 3
    ApplyingRules --> MLConsistency: Rule 4
    ApplyingRules --> PositionLegality: Rule 5
    
    BlunderThreshold --> Aggregating: Pass/Fail
    TacticalEvidence --> Aggregating: Pass/Fail
    EngineSupport --> Aggregating: Pass/Fail
    MLConsistency --> Aggregating: Pass/Fail
    PositionLegality --> Aggregating: Pass/Fail
    
    Aggregating --> Consistent: All passed or warnings only
    Aggregating --> Inconsistent: At least 1 error
    
    Consistent --> [*]: Return CriticResult (OK)
    
    Inconsistent --> Fallback: Trigger re-generation
    Fallback --> RestrictedPrompt: Generate with constraints
    RestrictedPrompt --> Revalidate: Validate again
    
    Revalidate --> Consistent: Now OK
    Revalidate --> FinalFallback: Still inconsistent
    
    FinalFallback --> Template: Use predefined template
    Template --> [*]: Return CriticResult (forced)
    
    note right of Aggregating
        Confidence = 
        passed_rules / total_rules
    end note
    
    note right of Fallback
        Restrictions:
        - avoid_tactics
        - cite_engine_only
        - no_speculation
    end note
```

---

## 7. Diagrama de Ciclo de Vida de Análisis

```mermaid
graph TD
    Start([Usuario sube PGN]) --> Parse[Parse PGN]
    Parse --> Store[Guardar en DB<br/>games table]
    Store --> Trigger[Trigger Analysis]
    
    Trigger --> Plan[Planner:<br/>Identificar jugadas críticas]
    Plan --> Execute[Executor:<br/>Analizar con Engine/ML/RAG]
    
    Execute --> HasML{ML model<br/>disponible?}
    HasML -->|Sí| MLPredict[Predicción ML]
    HasML -->|No| SkipML[Skip ML]
    MLPredict --> HasRAG
    SkipML --> HasRAG
    
    HasRAG{RAG<br/>disponible?}
    HasRAG -->|Sí| RAGQuery[Query RAG]
    HasRAG -->|No| SkipRAG[Skip RAG]
    RAGQuery --> Explain
    SkipRAG --> Explain
    
    Explain[Explainer:<br/>Generar explicación LLM]
    Explain --> Validate[Critic:<br/>Validar coherencia]
    
    Validate --> IsConsistent{is_consistent?}
    IsConsistent -->|Sí| StoreV2[Memory:<br/>Guardar move_analyses]
    IsConsistent -->|No| Retry{Retries < 1?}
    
    Retry -->|Sí| Regenerate[Regenerar con restricciones]
    Regenerate --> Explain
    Retry -->|No| ForcedStore[Guardar con flag<br/>requires_review]
    
    StoreV2 --> DualWrite[Dual Write:<br/>Guardar en moves legacy]
    ForcedStore --> DualWrite
    
    DualWrite --> UpdatePatterns[Memory:<br/>Actualizar player_patterns]
    UpdatePatterns --> BuildReport[Construir AnalysisReport]
    
    BuildReport --> ReturnAPI[Retornar a API]
    ReturnAPI --> End([Frontend muestra resultados])
    
    %% Styling
    classDef decision fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    classDef process fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef endpoint fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    
    class HasML,HasRAG,IsConsistent,Retry decision
    class Plan,Execute,MLPredict,RAGQuery,Explain,Validate,Regenerate process
    class Store,StoreV2,DualWrite,UpdatePatterns storage
    class Start,End endpoint
```

---

## 8. Diagrama de Migración de Base de Datos

```mermaid
graph TB
    subgraph "Estado Inicial (v1.0)"
        Legacy[Tabla moves<br/>ACTIVA]
    end
    
    subgraph "Fase 1: Agregar Tablas (Día 1)"
        F1A[Ejecutar Alembic migration]
        F1B[Crear move_analyses]
        F1C[Crear player_patterns]
        F1D[Legacy sigue funcionando]
    end
    
    subgraph "Fase 2: Dual Write (Semana 1-2)"
        F2A[Flag: ENABLE_DUAL_WRITE=true]
        F2B[Escribir en move_analyses]
        F2C[Escribir en moves legacy]
        F2D[100% redundancia]
    end
    
    subgraph "Fase 3: Dual Read (Semana 3-4)"
        F3A[Flag: PREFER_VERSION=v2.0]
        F3B[Leer de move_analyses]
        F3C[Fallback a moves si vacío]
        F3D[Frontend sin cambios]
    end
    
    subgraph "Fase 4: Migración Histórica (Semana 5-6)"
        F4A[Script: migrate_legacy_to_v2.py]
        F4B[Lotes de 1000 registros]
        F4C[Adaptar formato legacy]
        F4D[Marcar: version='v1.0-migrated']
    end
    
    subgraph "Fase 5: Deprecar (Mes 4)"
        F5A[Verificar: 0 lecturas en moves]
        F5B[Renombrar: moves_legacy_deprecated]
        F5C[Exportar backup CSV]
        F5D[DROP después de 90 días]
    end
    
    subgraph "Estado Final (v2.0)"
        NewDB[Solo move_analyses<br/>ACTIVA]
    end
    
    Legacy --> F1A
    F1A --> F1B
    F1B --> F1C
    F1C --> F1D
    
    F1D --> F2A
    F2A --> F2B
    F2B --> F2C
    F2C --> F2D
    
    F2D --> F3A
    F3A --> F3B
    F3B --> F3C
    F3C --> F3D
    
    F3D --> F4A
    F4A --> F4B
    F4B --> F4C
    F4C --> F4D
    
    F4D --> F5A
    F5A --> F5B
    F5B --> F5C
    F5C --> F5D
    
    F5D --> NewDB
    
    %% Styling
    classDef legacy fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    classDef migration fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    classDef new fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    
    class Legacy legacy
    class F1A,F1B,F1C,F1D,F2A,F2B,F2C,F2D,F3A,F3B,F3C,F3D,F4A,F4B,F4C,F4D,F5A,F5B,F5C,F5D migration
    class NewDB new
```

**Cronograma:**
- ⏱️ Fase 1: 1 día (bajo riesgo)
- ⏱️ Fase 2: 1-2 semanas (bajo riesgo)
- ⏱️ Fase 3: 1-2 semanas (medio riesgo)
- ⏱️ Fase 4: 2 semanas (alto riesgo, opcional)
- ⏱️ Fase 5: 3-4 meses después (muy alto riesgo)

---

## 9. Diagrama de Dependencias de Servicios

```mermaid
graph TD
    subgraph "External Dependencies"
        OpenAI[OpenAI API<br/>gpt-4]
        HuggingFace[HuggingFace<br/>Model Hub]
    end
    
    subgraph "Core Services"
        Planner[Planner Service]
        Executor[Executor Service]
        Critic[Critic Service]
        Explainer[Explainer Service]
        Memory[Memory Service]
    end
    
    subgraph "Infrastructure Services"
        EngineService[Engine Service<br/>Stockfish wrapper]
        FeatureSummarizer[Feature Summarizer<br/>Feature extraction]
        MLPredictor[ML Predictor<br/>Error classification]
        RAGService[RAG Service<br/>ChromaDB wrapper]
        CVService[CV Service<br/>FEN extraction]
        LLMClient[LLM Client<br/>Ollama wrapper]
    end
    
    subgraph "Data Services"
        GameRepo[Game Repository]
        AnalysisRepo[Analysis Repository]
        UserRepo[User Repository]
    end
    
    %% Dependencies
    Executor --> EngineService
    Executor --> FeatureSummarizer
    Executor --> MLPredictor
    Executor --> RAGService
    Executor --> CVService
    
    FeatureSummarizer --> EngineService
    
    MLPredictor -.->|Training| HuggingFace
    
    Explainer --> LLMClient
    LLMClient -.->|Alternative| OpenAI
    
    Memory --> AnalysisRepo
    Memory --> UserRepo
    
    Planner --> GameRepo
    
    RAGService -.->|Embeddings| OpenAI
    
    %% Styling
    classDef core fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef infra fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef data fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef external fill:#ffebee,stroke:#c62828,stroke-width:2px
    
    class Planner,Executor,Critic,Explainer,Memory core
    class EngineService,FeatureSummarizer,MLPredictor,RAGService,CVService,LLMClient infra
    class GameRepo,AnalysisRepo,UserRepo data
    class OpenAI,HuggingFace external
```

**Dependencias Externas:**
- **OpenAI API:** Embeddings para RAG (opcional: usar sentence-transformers local)
- **HuggingFace:** Pre-trained models para fine-tuning (Fase 4)

**Dependencias Internas:**
- Executor tiene más dependencias (Engine, Features, ML, RAG, CV)
- Planner es independiente (solo lee opciones)
- Critic no tiene dependencias infraestructurales (solo reglas)

---

## 10. Diagrama de Feature Flags y Rollback

```mermaid
graph LR
    subgraph "Production Environment"
        Env[.env file]
    end
    
    subgraph "Feature Flags"
        F1[ENABLE_ORCHESTRATED_ANALYSIS<br/>true/false]
        F2[ENABLE_DUAL_WRITE<br/>true/false]
        F3[PREFER_VERSION<br/>v1.0/v2.0]
        F4[ENABLE_LEGACY_MIGRATION<br/>true/false]
    end
    
    subgraph "API Behavior"
        Route[/api/analysis endpoint]
    end
    
    subgraph "Version Selection"
        V1[Legacy Flow<br/>LLMAnalysisService]
        V2[Orchestrated Flow<br/>AnalyzeGameUseCase]
    end
    
    subgraph "Database Writes"
        W1[Write to moves only]
        W2[Write to both tables]
        W3[Write to move_analyses only]
    end
    
    subgraph "Database Reads"
        R1[Read from moves only]
        R2[Read v2.0, fallback v1.0]
        R3[Read from move_analyses only]
    end
    
    Env --> F1
    Env --> F2
    Env --> F3
    Env --> F4
    
    F1 -->|true| Route
    F1 -->|false| Route
    
    Route -->|F1=true| V2
    Route -->|F1=false| V1
    
    V2 --> CheckF2{F2?}
    CheckF2 -->|true| W2
    CheckF2 -->|false| W3
    
    V1 --> W1
    
    Route --> CheckF3{F3?}
    CheckF3 -->|v2.0| R2
    CheckF3 -->|v1.0| R1
    
    %% Rollback path
    V2 -.->|Error| Rollback[Rollback Steps]
    Rollback --> SetF1False[Set F1=false]
    SetF1False --> RestartAPI[Restart API]
    RestartAPI --> V1
    
    %% Styling
    classDef config fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    classDef flag fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef version fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef db fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    classDef rollback fill:#ffcdd2,stroke:#c62828,stroke-width:2px,stroke-dasharray: 5 5
    
    class Env config
    class F1,F2,F3,F4 flag
    class V1,V2,Route version
    class W1,W2,W3,R1,R2,R3 db
    class Rollback,SetF1False,RestartAPI rollback
```

**Rollback en Producción:**
1. Detectar error en v2.0
2. `export ENABLE_ORCHESTRATED_ANALYSIS=false`
3. `systemctl restart chess_trainer_api`
4. Sistema vuelve a v1.0 (legacy)
5. Datos NO se pierden (dual write los protege)

---

## Resumen de Diagramas

| Diagrama | Propósito | Audiencia |
|----------|-----------|-----------|
| **1. Componentes** | Vista general de arquitectura | Todos |
| **2. Secuencia** | Flujo detallado del use case | Desarrolladores |
| **3. Flujo de Datos** | Transformación de datos | Arquitectos |
| **4. Base de Datos** | Schema y relaciones | DBAs, Backend |
| **5. Despliegue** | Infraestructura Docker | DevOps |
| **6. Estados Critic** | Validación y fallbacks | Desarrolladores |
| **7. Ciclo de Vida** | Proceso end-to-end | Product Managers |
| **8. Migración DB** | Estrategia de migración | DBAs, Tech Leads |
| **9. Dependencias** | Servicios y relaciones | Arquitectos |
| **10. Feature Flags** | Control y rollback | DevOps, SRE |

---

## Próximos Pasos

1. ✅ **Diagramas de arquitectura creados**
2. ⏭️ **Revisar con equipo técnico**
3. ⏭️ **Actualizar README.md con enlaces a diagramas**
4. ⏭️ **Cerrar Issue #85 (Fase 0 completa)**
5. ⏭️ **Comenzar Fase 1: Implementación**

---

**Documento creado:** Marzo 25, 2026  
**Autor:** AI Assistant + sergiosal  
**Herramientas:** Mermaid.js  
**Estado:** DRAFT v1.0
