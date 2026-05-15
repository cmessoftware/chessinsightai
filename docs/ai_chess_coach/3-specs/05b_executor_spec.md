# Spec 05b — Executor

## Purpose
Execute analysis tasks defined by Planner and produce structured evidence.

## Inputs
- analysis_plan
- game data (FENs, moves)
- engine config
- ML outputs

## Outputs
- evidence_pack (per focus item)

## Contract (JSON)
{
  "game_id": "string",
  "plan_id": "string",
  "evidence_pack_id": "string",
  "items": [
    {
      "focus_ref": 0,
      "engine": {
        "depth": 20,
        "best_line": ["e4", "e5", "..."],
        "eval_before": 35,
        "eval_after": -120
      },
      "features": {
        "material_balance": 0,
        "mobility_self": 18,
        "mobility_opponent": 24
      },
      "ml": {
        "predicted_label": "mistake",
        "confidence": 0.57
      },
      "patterns": ["pin", "overloaded_piece"]
    }
  ]
}

## Rules
1. No natural language output
2. Each item must include:
   - engine evidence
   - feature snapshot
   - ML output (if available)
3. Parallel execution allowed, but results must be merged deterministically

## Invariants
- Every focus item → at least one evidence item
- No missing references
- Consistent IDs (game_id, plan_id)

## Validation
- Integration tests
- Evidence completeness checks

## Evidence
- evidence_pack JSON
- engine logs