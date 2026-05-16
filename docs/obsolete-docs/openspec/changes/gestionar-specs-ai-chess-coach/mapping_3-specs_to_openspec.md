# Mapping 3-specs -> OpenSpec Capabilities

## Source To Capability Mapping

- `3-specs/01_system_spec.md` -> `system-pipeline`
- `3-specs/02_pgn_intake_spec.md` -> `pgn-intake`
- `3-specs/03_feature_extraction_spec.md` -> `feature-extraction`
- `3-specs/04_ml_classification_spec.md` -> `ml-classification`
- `3-specs/05_orchestrated_analysis_spec.md` -> `orchestrated-analysis`
- `3-specs/05a_planner_spec.md` -> `planner`
- `3-specs/05b_executor_spec.md` -> `executor`
- `3-specs/05c_critic_spec.md` -> `critic`
- `3-specs/05d_memory_spec.md` -> `memory-profile`
- `3-specs/06_visualization_spec.md` -> `insights-visualization`
- `3-specs/07_acceptance_criteria.md` -> `acceptance-gates`
- `3-specs/08_verification_matrix.md` -> `verification-matrix`

## Incremental Migration Priority

1. Wave 1 (foundation)
- `pgn-intake`
- `feature-extraction`
- `ml-classification`

2. Wave 2 (orchestration core)
- `orchestrated-analysis`
- `planner`
- `executor`
- `critic`
- `memory-profile`

3. Wave 3 (system governance and UI)
- `system-pipeline`
- `insights-visualization`
- `acceptance-gates`
- `verification-matrix`

## Changes Created For Waves

- `migrate-pgn-feature-specs`
- `migrate-ml-orchestration-visual-specs`
- `migrate-system-spec`

All three migration changes are active and validated in OpenSpec.
