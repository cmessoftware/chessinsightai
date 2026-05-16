# ChessInsightAI Documentation Folder Structure

## Scope

This structure separates implementation, research, testing, and operations documentation.

## Target Tree

```text
docs/
├── architecture/
├── modules/
├── roadmap/
│   └── templates/
├── testing/
├── devops/
├── observability/
├── research/
├── ai_chess_coach/
├── ml_analysis/
└── sdd_engine/
```

## Domain Taxonomy (Implementation Domains)

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

## Design Rules

- LLM never decides.
- LLM only explains grounded evidence.
- Keep PoCs and notebooks out of production implementation docs.
- Every module must map to roadmap phases and issue labels.
