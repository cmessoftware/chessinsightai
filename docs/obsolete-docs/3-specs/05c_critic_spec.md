# Spec 05c — Critic

## Purpose
Validate candidate insights against evidence and enforce anti-hallucination rules.

## Inputs
- evidence_pack
- draft_insights (structured or templated text)
- validation rules

## Outputs
- validated_insights with status

## Contract (JSON)
{
  "game_id": "string",
  "insights": [
    {
      "insight_id": "string",
      "claim": "string",
      "evidence_refs": ["evidence_item_id"],
      "status": "VERIFIED|WARNING|REJECTED",
      "reasons": ["supported_by_engine", "low_confidence", "missing_evidence"]
    }
  ]
}

## Rules
- VERIFIED:
  - claim supported by engine AND features
- WARNING:
  - partial support OR low confidence
- REJECTED:
  - no evidence OR contradiction

## Guardrails
1. No claim without evidence_refs
2. If ML contradicts engine, downgrade to WARNING
3. If missing evidence → REJECTED

## Invariants
- Every insight must have a status
- No REJECTED insight proceeds to UI

## Validation
- Rule-based tests
- Contradiction scenarios

## Evidence
- critic decision logs