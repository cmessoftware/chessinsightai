# Architectural Documentation Reengineering for ChessInsightAI

## Objective

Perform a complete reengineering of the architectural and functional documentation for the ChessInsightAI project in order to reorganize:

- modules
- bounded contexts
- epics
- issues
- labels
- roadmap
- ownership
- testing
- pipelines
- technical documentation

The new structure must be prepared for:

- automatic epic generation
- automatic Gitea issue generation
- technical traceability
- separation of responsibilities
- future scalability
- CI/CD integration
- automated testing
- multi-phase roadmap planning

---

# Main Requirements

## 1. Reorganize Architecture by Domains

Reorganize all documentation using this main structure:

```text
01-core-engine
02-ml
03-orchestration
04-rag-llm
05-api
06-ui
07-observability
08-devops
09-testing
10-research
```

---

# 2. Reorganize Submodules

## 01-core-engine

```text
01-core-engine
 ├── pgn-parser
 ├── stockfish-analysis
 ├── feature-extraction
 ├── tactical-tagging
 ├── phase-detection
 └── evaluation-normalization
```

## 02-ml

```text
02-ml
 ├── ml-error-classification
 ├── ml-critical-blunder-sequence
 ├── ml-playstyle-clustering
 ├── ml-training-pipeline
 ├── ml-model-evaluation
 ├── ml-shap-explainability
 └── ml-datasets
```

## 03-orchestration

```text
03-orchestration
 ├── planner
 ├── executor
 ├── critic
 ├── memory
 ├── execution-policies
 ├── fallback-strategies
 └── validation-rules
```

## 04-rag-llm

```text
04-rag-llm
 ├── chess-document-extraction
 ├── chess-embeddings
 ├── chromadb-indexing
 ├── rag-retrieval
 ├── llm-grounding
 ├── llm-prompt-engineering
 ├── llm-explanation-generation
 └── hallucination-control
```

## 05-api

```text
05-api
 ├── rest-contracts
 ├── dto-schemas
 ├── orchestrated-analysis-api
 ├── auth-security
 ├── websocket-streaming
 └── api-versioning
```

## 06-ui

```text
06-ui
 ├── dashboard
 ├── pgn-upload
 ├── move-analysis-viewer
 ├── chessboard-ui
 ├── training-center
 ├── player-profile
 └── explainability-ui
```

## 07-observability

```text
07-observability
 ├── mlflow-tracking
 ├── prompt-logging
 ├── critic-metrics
 ├── execution-metrics
 ├── telemetry
 ├── audit-trails
 └── inference-monitoring
```

## 08-devops

```text
08-devops
 ├── docker
 ├── deployment
 ├── feature-flags
 ├── migrations
 ├── rollback-strategies
 ├── ci-cd
 └── infrastructure
```

## 09-testing

```text
09-testing
 ├── unit-tests
 ├── integration-tests
 ├── e2e-tests
 ├── llm-evaluation
 ├── regression-tests
 ├── prompt-tests
 ├── critic-validation-tests
 └── synthetic-games
```

## 10-research

```text
10-research
 ├── notebooks
 ├── experiments
 ├── datasets-analysis
 ├── feature-ideas
 ├── sequence-analysis-research
 └── model-benchmarks
```

---

# 3. Reorganize Labels

Generate labels separated by:

## Domain Labels

```text
domain:core-engine
domain:ml
domain:orchestration
domain:rag
domain:llm
domain:api
domain:ui
domain:data
domain:testing
domain:devops
domain:research
domain:observability
```

## Type Labels

```text
type:feature
type:bug
type:refactor
type:research
type:test
type:spike
type:documentation
```

## Priority Labels

```text
priority:p0
priority:p1
priority:p2
priority:p3
```

## Status Labels

```text
status:blocked
status:in-progress
status:review
status:done
status:deprecated
```

## Cross-Cutting Labels

```text
cross-cutting
hallucination-control
evaluation-grounding
explainability
caching
performance
```

---

# 4. Reorganize Technical Aliases

Use consistent 4-letter aliases.

Examples:

```text
MLER = ml-error-classification
CBSD = critical-blunder-sequence-detector
PLCL = playstyle-clustering

ORPL = orchestration-planner
OREX = orchestration-executor
ORCR = orchestration-critic
ORMM = orchestration-memory

RAGR = rag-retrieval
LLMG = llm-grounding
LLMX = llm-explanation-generation
```

---

# 5. Generate New Documents

Automatically create:

```text
/docs
/docs/architecture
/docs/modules
/docs/roadmap
/docs/testing
/docs/devops
/docs/observability
/docs/research
```

---

# 6. Generate Templates

## Epic Template

Generate markdown templates for epics including:

```text
- objective
- scope
- dependencies
- risks
- metrics
- definition of done
- testing strategy
- rollback strategy
```

## Issue Template

Generate markdown templates for issues including:

```text
- context
- technical objective
- subtasks
- acceptance criteria
- testing
- risks
- labels
- dependencies
```

---

# 7. Reorganize Roadmap

Generate a phase-based roadmap:

```text
Phase 1 → core-engine + minimal api
Phase 2 → ml-error-classification
Phase 3 → orchestration
Phase 4 → rag
Phase 5 → llm-grounding
Phase 6 → advanced critic
Phase 7 → memory + personalization
Phase 8 → advanced ml
Phase 9 → critical-blunder-sequence
Phase 10 → playstyles
```

---

# 8. Important Rules

## VERY IMPORTANT

DO NOT mix:

- research
- notebooks
- PoCs
- production code

Clearly separate:

- implementation
- research
- testing
- infrastructure

---

## VERY IMPORTANT

The architecture must reflect:

```text
LLM NEVER DECIDES
LLM ONLY EXPLAINS EVIDENCE
```

All explanations must be grounded in:

- Stockfish
- ML
- RAG
- validation rules

---

## VERY IMPORTANT

The system must be prepared for:

- Gitea issue generation
- OpenSpec integration
- CI/CD pipelines
- observability
- rollback
- feature flags
- future multi-agent architecture

---

# 9. Expected Deliverables

Generate:

1. New folder structure
2. New module taxonomy
3. New labels
4. New aliases
5. New templates
6. New roadmap
7. Migration document
8. Consolidated architecture document
9. Testing strategy document
10. Observability document
11. Module dependency document

---

# 10. Expected Output

Generate complete markdown files ready to:

- copy into the repository
- use in Gitea
- use in OpenSpec
- create epics
- create issues
- generate technical roadmaps
- plan incremental implementation

Use:

- tables
- Mermaid diagrams
- folder trees
- concrete examples
- consistent conventions
- enterprise-grade naming conventions