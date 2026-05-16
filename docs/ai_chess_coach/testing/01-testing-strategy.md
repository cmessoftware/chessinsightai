# Testing Strategy

## Test Pyramid

| Level | Focus |
| --- | --- |
| Unit | deterministic domain logic |
| Integration | cross-module contracts |
| E2E | full analysis + API/UI flow |
| LLM Evaluation | grounding and hallucination checks |

## Mandatory Gates

- Critic validation tests for contradiction and unsupported claims.
- Prompt tests that enforce "insufficient data" behavior.
- Regression tests for tactical tags and score_diff behavior.

## Release Gate

No phase can be marked done unless:
- all required tests are green
- critical p0 defects are closed
- rollback test is verified
