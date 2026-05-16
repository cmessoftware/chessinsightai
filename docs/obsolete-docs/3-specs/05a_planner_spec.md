# Spec 05a — Planner

## Purpose
Define a deterministic analysis plan prioritizing critical segments of a game.

## Inputs
- ML predictions (per ply)
- score_diff_cp
- phase labels
- optional player profile (historical patterns)
- configuration (thresholds, max_items)

## Outputs
- analysis_plan (ordered, serializable)

## Contract (JSON)
{
  "game_id": "string",
  "plan_id": "string",
  "generated_at": "ISO8601",
  "focus_items": [
    {
      "type": "move|sequence|phase",
      "label": "critical_blunder_sequence|opening_pattern|endgame_issue|tactical_motif",
      "start_ply": 0,
      "end_ply": 0,
      "priority": 1,
      "reasons": ["high_score_diff", "ml_blunder", "repetition_pattern"]
    }
  ],
  "priority_order": [0,1,2]
}

## Rules
1. Prioritize by:
   - |score_diff| descending
   - ML label severity (blunder > mistake > inaccuracy > good)
   - sequence continuity (group adjacent plies)
2. Max focus_items is configurable
3. Deterministic: same input → same plan

## Invariants
- No text explanations
- No engine calls
- Stable ordering

## Validation
- Snapshot tests for determinism
- Coverage tests for edge cases (no blunders, only endgame, etc.)

## Evidence
- plan JSON
- input hashes