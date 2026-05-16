## ADDED Requirements

### Requirement: Deterministic plan generation
The planner SHALL produce a deterministic, serializable `analysis_plan` for identical input data and configuration.

#### Scenario: Same input and thresholds repeated
- **WHEN** planner runs multiple times with identical ML predictions, score deltas, phases, and config
- **THEN** generated plan content and ordering are identical

### Requirement: Priority ordering rules
The planner MUST prioritize focus items by absolute score delta, ML severity, and sequence continuity while respecting configurable max item limits.

#### Scenario: Multiple candidate segments exist
- **WHEN** planner ranks focus candidates
- **THEN** higher score-delta and higher-severity labels are prioritized and adjacent plies are grouped when continuity applies

### Requirement: Planner scope guardrails
Planner output MUST contain no text explanation and no engine evaluation calls.

#### Scenario: Plan artifact emitted
- **WHEN** planner completes
- **THEN** output is structured JSON-only plan data with no natural language reasoning fields
