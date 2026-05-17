## ADDED Requirements

### Requirement: Per-ply feature extraction contract
The system SHALL compute and persist a structured feature vector for each ply using FEN list, move list, and engine configuration.

#### Scenario: Features are generated per ply
- **WHEN** a valid sequence of positions is provided to feature extraction
- **THEN** each ply includes score-before/after metrics, material and mobility metrics, legal move count, game phase, tactical tags, and opening context

### Requirement: Score difference consistency
The value `score_diff_cp` MUST equal `score_after_cp - score_before_cp` for each ply where both evaluations exist.

#### Scenario: Both evaluations available
- **WHEN** `score_before_cp` and `score_after_cp` are present
- **THEN** `score_diff_cp` is computed exactly as `score_after_cp - score_before_cp`

### Requirement: Null safety for missing data
Missing feature values SHALL be represented explicitly as `null` and MUST NOT be omitted implicitly.

#### Scenario: Engine value unavailable
- **WHEN** a feature cannot be computed for a ply
- **THEN** that feature key remains present with value `null`

### Requirement: Feature traceability keys
Every extracted feature record MUST include `game_id`, `ply`, and `FEN` to preserve downstream traceability.

#### Scenario: Feature row is emitted
- **WHEN** the extractor produces a row for a specific ply
- **THEN** the row contains `game_id`, `ply`, and `FEN` alongside computed values

### Requirement: Feature extraction evidence
The extraction process SHALL record evidence including engine depth, evaluation time, and FEN snapshot used for each computed row.

#### Scenario: Extraction run completes
- **WHEN** feature extraction finishes for a game
- **THEN** run artifacts include engine depth, evaluation time metadata, and position snapshots required for audit
