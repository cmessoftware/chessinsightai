# Observability Strategy

## Objectives

- Trace every analysis request end-to-end.
- Measure quality, latency, and grounding reliability.
- Support safe rollback with evidence.

## Core Metrics

| Area | Metric |
| --- | --- |
| orchestration | execution_time, fallback_rate |
| critic | validation_pass_rate, contradiction_rate |
| rag | retrieval_hit_rate, avg_relevance_score |
| llm | grounded_response_rate, insufficient_data_rate |
| api | p95_latency, error_rate |

## Logging Requirements

- request_id and game_id in all logs
- prompt version and model version in LLM logs
- critic rule outcomes per move

## Alerting

- p95 latency above threshold
- contradiction rate spike
- retrieval hit rate collapse
- rollback activation event
