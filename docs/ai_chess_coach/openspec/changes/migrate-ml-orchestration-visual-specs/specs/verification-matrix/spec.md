## ADDED Requirements

### Requirement: Rule-to-evidence compliance mapping
The verification matrix SHALL maintain explicit mapping between spec rule, validation type, evidence source, and status.

#### Scenario: New rule enters compliance scope
- **WHEN** a spec requirement is introduced or modified
- **THEN** matrix receives row with rule identifier, validation method, evidence artifact, and initial status

### Requirement: Compliance metrics publication
The matrix MUST publish `spec_compliance_rate`, `failed_rules_count`, and `insight_validation_ratio` for each validation cycle.

#### Scenario: Validation cycle completes
- **WHEN** compliance checks finish
- **THEN** required metrics are computed and stored with cycle timestamp

### Requirement: Pending and failed rule traceability
Rules in pending or failed status SHALL include direct pointers to missing or failing evidence.

#### Scenario: Rule status is not passing
- **WHEN** a row remains pending or failed
- **THEN** matrix entry records missing evidence or failure logs for remediation
