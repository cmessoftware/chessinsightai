# DevOps Delivery Rules

## Required Capabilities

- Dockerized services for local reproducibility
- feature flags for orchestration and grounding controls
- migration + rollback scripts
- CI/CD gates for tests and docs quality

## Deployment Constraints

- No production rollout without rollback strategy.
- Schema migrations must be backward compatible for at least one release window.
- All feature flags require defaults and kill-switch behavior.
