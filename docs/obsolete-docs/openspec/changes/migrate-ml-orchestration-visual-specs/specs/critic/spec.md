## ADDED Requirements

### Requirement: Mandatory status assignment
The critic SHALL assign one status from `VERIFIED`, `WARNING`, or `REJECTED` to every candidate insight.

#### Scenario: Candidate insight enters critic
- **WHEN** an insight with claim and evidence references is evaluated
- **THEN** critic output includes one valid status and reason codes

### Requirement: Evidence-backed claim policy
Claims without evidence references MUST be rejected.

#### Scenario: Missing evidence references
- **WHEN** insight claim has no evidence linkage
- **THEN** critic sets status to `REJECTED` and records missing-evidence reason

### Requirement: Contradiction downgrade policy
When ML output contradicts engine evidence, critic MUST downgrade at least to `WARNING`.

#### Scenario: ML and engine disagree materially
- **WHEN** contradiction rules trigger
- **THEN** insight cannot be marked `VERIFIED`
- **AND** critic logs contradiction reason for audit

### Requirement: VERIFIED status requires both engine and features
A claim MAY only receive `VERIFIED` status when it is supported by engine evidence AND corroborated by feature evidence; the presence of only one evidence source MUST result in `WARNING` at most.

#### Scenario: Claim backed by engine but missing feature evidence
- **WHEN** a claim has engine evidence but no feature evidence
- **THEN** critic assigns `WARNING`, not `VERIFIED`

#### Scenario: Claim backed by both engine and feature evidence
- **WHEN** a claim has both engine evidence and corroborating feature evidence
- **THEN** critic MAY assign `VERIFIED`
