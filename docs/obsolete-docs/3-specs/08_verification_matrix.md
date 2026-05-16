# Spec 08 — Verification Matrix

| Spec | Rule | Type | Evidence | Status |
|------|------|------|----------|--------|
| S02 | PGN moves must be legal | unit | tests | pending |
| S03 | score_diff correctness | unit | logs | pending |
| S04 | ML includes model_version | schema | output | pending |
| S05 | Planner determinism | integration | snapshot | pending |
| S05 | Executor produces evidence | integration | evidence_pack | pending |
| S05 | Critic rejects unsupported claims | rule | logs | pending |
| S06 | UI hides rejected insights | e2e | UI output | pending |

## Metrics
- spec_compliance_rate
- failed_rules_count
- insight_validation_ratio