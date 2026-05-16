## Requirements

### Requirement: Functional acceptance gate
System acceptance SHALL require successful end-to-end processing with PGN intake, feature extraction, ML prediction, and validated insight generation completed.

#### Scenario: Candidate release is evaluated
- **WHEN** acceptance suite is executed for release candidate
- **THEN** all functional stages complete without critical contract violations

### Requirement: Validation quality thresholds
At least 90 percent of generated insights MUST be classified as VERIFIED or WARNING and zero insights without evidence are permitted.

#### Scenario: Validation report produced
- **WHEN** insight validation metrics are computed
- **THEN** ratio of VERIFIED plus WARNING is >= 0.90
- **AND** count of evidence-free insights is exactly 0

### Requirement: Determinism and consistency quality gate
For identical inputs and configuration, outputs MUST be deterministic and contradictions between engine, ML classification, and explanation state MUST be absent or explicitly downgraded by critic rules.

#### Scenario: Determinism audit run
- **WHEN** same game is processed multiple times
- **THEN** deterministic artifacts remain stable and contradiction handling follows critic policy

### Requirement: Configurable processing time limit
A maximum processing time per game MUST be configurable and enforced; processing that exceeds the configured limit SHALL be interrupted and reported as a timeout failure.

#### Scenario: Game processing exceeds configured time limit
- **WHEN** processing time for a single game surpasses the configured maximum
- **THEN** the pipeline interrupts that game, records a timeout-failure result, and continues with the next game
