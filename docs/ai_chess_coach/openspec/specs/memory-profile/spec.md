## Requirements

### Requirement: Longitudinal pattern persistence
The memory component SHALL persist validated recurring patterns and update player profile aggregates over time.

#### Scenario: Validated insights are ingested
- **WHEN** critic emits VERIFIED or WARNING insights eligible for memory
- **THEN** player profile is updated with pattern counts, last-seen timestamp, and confidence fields

### Requirement: Minimum support threshold
Patterns MUST satisfy configurable minimum occurrence threshold before being treated as recurring patterns.

#### Scenario: Pattern appears below threshold
- **WHEN** pattern count is below configured minimum
- **THEN** pattern is stored as non-recurring candidate and excluded from recurring profile metrics

### Requirement: Temporal decay and normalized aggregates
Historical signals SHALL apply temporal decay and aggregates MUST be normalized before computing rates like blunder or mistake rate.

#### Scenario: Profile recomputation occurs
- **WHEN** memory recalculates aggregate metrics
- **THEN** older events are decayed per policy and resulting rates are normalized for comparability
