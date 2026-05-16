## Requirements

### Requirement: Deterministic end-to-end pipeline contract
The system SHALL transform PGN input into actionable validated insights through deterministic staged flow: parsing, feature extraction, ML classification, orchestration, critic validation, and visualization.

#### Scenario: Same game processed with same configuration
- **WHEN** identical PGN and configuration are processed repeatedly
- **THEN** produced structured outputs remain deterministic across runs

### Requirement: Evidence-first insight policy
No insight SHALL be published without traceable evidence references.

#### Scenario: Insight candidate reaches publication gate
- **WHEN** an insight lacks required evidence linkage
- **THEN** the insight is blocked from publication and treated as non-compliant

### Requirement: Classification metadata completeness
No ML classification output MUST be accepted without `model_version` and `confidence` fields.

#### Scenario: Incomplete classification payload
- **WHEN** classification metadata is missing
- **THEN** downstream insight generation is halted for affected items

### Requirement: Critic status and UI exposure policy
Visualization MUST expose only critic-approved statuses (`VERIFIED` or `WARNING`) and MUST exclude `REJECTED` insights.

#### Scenario: UI receives validated insights
- **WHEN** rendering insight list
- **THEN** only VERIFIED and WARNING entries are displayed

### Requirement: Global traceability identifiers
All pipeline entities MUST include `game_id` and `trace_id`, and each insight SHALL reference feature, engine, ML, and evidence identifiers.

#### Scenario: Final insight artifact is produced
- **WHEN** insight package is emitted
- **THEN** it contains `game_id`, `trace_id`, and references to feature_set, engine_eval, ml_prediction, and evidence_pack identifiers

### Requirement: Required evidence artifacts
Pipeline execution SHALL produce structured logs, reproducible fixtures, validation reports, and support for golden datasets.

#### Scenario: Validation cycle completes
- **WHEN** a game analysis run is finalized
- **THEN** evidence artifacts are persisted and available for audit and reproducibility checks
