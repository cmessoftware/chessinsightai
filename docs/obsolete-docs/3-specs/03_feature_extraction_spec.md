# Spec 03 — Feature Extraction

## Purpose
Transform positions into structured feature vectors per move.

## Inputs
- FEN list
- move list
- engine configuration (depth, time)

## Outputs (per ply)
- score_before_cp
- score_after_cp
- score_diff_cp
- mate_in_before / mate_in_after
- material_balance
- mobility_self / mobility_opponent
- legal_moves_count
- phase (opening/middlegame/endgame)
- tactical_tags
- opening context

## Derived Rules
- score_diff = score_after - score_before

## Invariants
1. No score_diff without both evaluations
2. All features must be linked to:
   - game_id
   - ply
   - FEN
3. Missing values must be explicit (null)

## Validation
- Unit tests per feature
- Statistical range validation
- Known position benchmarks

## Evidence
- engine depth
- evaluation time
- FEN snapshot