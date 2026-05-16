## Requirements

### Requirement: Display only critic-approved insights
The UI SHALL never display insights marked `REJECTED`.

#### Scenario: Visualization payload prepared
- **WHEN** validated insights are sent to presentation layer
- **THEN** only VERIFIED and WARNING items are rendered

### Requirement: Traceable insight presentation
Every displayed insight MUST include traceability reference to underlying evidence artifacts.

#### Scenario: Insight card is rendered
- **WHEN** user views an insight in UI
- **THEN** the rendered item includes trace_id or equivalent evidence reference

### Requirement: No analytical logic in UI
Visualization layer MUST NOT derive new analytical conclusions beyond provided validated outputs.

#### Scenario: UI computes derived view
- **WHEN** UI prepares charts and lists
- **THEN** transformations are presentation-only and do not create new claims not present in validated input
