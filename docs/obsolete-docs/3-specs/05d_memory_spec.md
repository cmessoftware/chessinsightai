# Spec 05d — Memory

## Purpose
Persist validated patterns and build a longitudinal player profile.

## Inputs
- validated_insights (VERIFIED/WARNING)
- historical data (previous games)

## Outputs
- player_profile
- pattern_statistics

## Contract (JSON)
{
  "player_id": "string",
  "updated_at": "ISO8601",
  "patterns": [
    {
      "pattern": "isolated_pawn",
      "count": 12,
      "last_seen": "ISO8601",
      "phase": "middlegame",
      "confidence": 0.82
    }
  ],
  "aggregates": {
    "blunder_rate": 0.12,
    "mistake_rate": 0.25
  }
}

## Rules
1. Minimum occurrences threshold (configurable, e.g., n ≥ 5)
2. Temporal decay for old patterns
3. Separate:
   - single-event insights
   - recurring patterns

## Invariants
- No pattern without sufficient support
- No aggregation without normalization

## Validation
- Statistical tests
- Time-window validation

## Evidence
- pattern counts
- timestamps