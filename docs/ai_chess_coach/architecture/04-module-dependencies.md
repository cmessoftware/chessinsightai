# Module Dependency Document

## Domain Dependencies

```mermaid
graph TD
CE[01-core-engine] --> ML[02-ml]
CE --> OR[03-orchestration]
ML --> OR
OR --> RL[04-rag-llm]
RL --> API[05-api]
API --> UI[06-ui]
OR --> OB[07-observability]
API --> OB
OR --> DV[08-devops]
OB --> DV
CE --> TS[09-testing]
ML --> TS
OR --> TS
RL --> TS
TS --> RS[10-research]
```

## Policy

- Higher-level domains cannot bypass critical validation in orchestration.
- RAG/LLM can consume evidence but cannot mutate engine truth.
- Testing dependencies are mandatory before phase closure.
