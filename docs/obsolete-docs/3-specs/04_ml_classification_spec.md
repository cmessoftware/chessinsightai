# Spec 04 — ML Classification

## Purpose
Classify move quality using trained ML models.

## Inputs
- feature vector
- model_version
- inference configuration

## Outputs
- predicted_label (good / inaccuracy / mistake / blunder)
- class_probabilities
- confidence score
- SHAP feature contributions

## Invariants
1. Every prediction must include model_version
2. Confidence must be present
3. No prediction without complete feature vector

## Rules
- confidence < threshold → mark as uncertain
- classification ≠ explanation

## Validation
- confusion matrix evaluation
- regression tests
- performance by ELO bucket

## Evidence
- feature snapshot
- raw model output
- SHAP explanation