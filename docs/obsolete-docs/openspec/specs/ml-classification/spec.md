## Requirements

### Requirement: Complete prediction payload
The system SHALL classify move quality using trained ML models and include `predicted_label`, `class_probabilities`, `confidence`, and `model_version` in every prediction output.

#### Scenario: Prediction is produced
- **WHEN** a complete feature vector is submitted for inference
- **THEN** output includes label, probabilities, confidence score, and model version metadata

### Requirement: Feature completeness precondition
The classifier MUST reject inference requests with incomplete feature vectors.

#### Scenario: Missing feature field
- **WHEN** required features are missing or null without allowance in schema
- **THEN** prediction is not emitted and validation error is returned

### Requirement: Uncertainty handling and explainability evidence
Predictions with confidence below configured threshold SHALL be marked uncertain and MUST include explainability evidence derived from SHAP.

#### Scenario: Low-confidence prediction
- **WHEN** confidence is below threshold
- **THEN** prediction is flagged as uncertain
- **AND** output stores SHAP contributions and raw model output snapshot
