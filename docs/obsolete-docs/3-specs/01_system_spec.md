# AI Chess Coach — System Specification

## Purpose
Transform PGN games into actionable, verifiable, and personalized insights through a deterministic pipeline: parsing → features → ML → orchestration → validation → visualization.
Note: Specs 00, 01, 02, and 03 focus on the ML pipeline; validate alignment of existing scripts with these specifications.

## Scope
Includes:
- PGN ingestion
- Engine evaluation
- Feature extraction
- ML classification
- Orchestration (Planner/Executor/Critic/Memory)
- Generation of validated insights
- UI exposure

Excludes:
- Model training (outside of runtime)
- Integration with external platforms (later phase)

## Inputs
- PGN (string or file)
- Configuration (engine depth, timeouts, toggles)
- Player historical profile (optional)

## Outputs
- Validated insights (with status)
- Metrics by phase
- Classification per move
- Recommendations
- Suggested exercises

## Global Invariants
1. No insight without traceable evidence
2. No classification without `model_version` and `confidence`
3. UI only shows `VERIFIED` or `WARNING` insights
4. Every entity must have `game_id` and `trace_id`
5. Determinism: same input + config → same output

## Validation States (Critic)
- VERIFIED
- WARNING
- REJECTED

## Traceability
Each insight must reference:
- game_id
- ply/sequence
- feature_set_id
- engine_eval_id
- ml_prediction_id
- evidence_pack_id

## Risks
- ML model drift
- Engine inconsistency (variable depth)
- Invalid PGN
- Overinterpretation in explanations

## Required Evidence
- Structured logs
- Reproducible fixtures
- Golden datasets
- Validation reports