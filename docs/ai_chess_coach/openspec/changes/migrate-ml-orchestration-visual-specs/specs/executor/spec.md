## ADDED Requirements

### Requirement: Evidence pack per focus item
The executor SHALL transform each focus item from analysis plan into at least one structured evidence item containing engine, feature, and ML sections when available.

#### Scenario: Focus item is executed
- **WHEN** executor processes a focus reference from plan
- **THEN** resulting evidence pack includes linked engine evaluation, feature snapshot, and ML output metadata

### Requirement: Deterministic merge after parallel work
Parallel execution MAY be used internally, but merged evidence output MUST remain deterministic for identical inputs and configuration.

#### Scenario: Parallel execution enabled
- **WHEN** executor runs tasks concurrently
- **THEN** final evidence pack ordering and IDs are stable across repeated runs

### Requirement: Structured output only
Executor MUST NOT produce final natural-language insights.

#### Scenario: Execution finished
- **WHEN** executor completes plan processing
- **THEN** output is evidence-pack JSON and execution logs only
