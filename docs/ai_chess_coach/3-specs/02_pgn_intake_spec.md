# Spec 02 — PGN Intake & Parsing

## Purpose
Parse raw PGN input into structured, reproducible game data.

## Inputs
- PGN string or file
- Encoding: UTF-8

## Outputs
- game_id (UUID)
- metadata (players, result, date, event)
- ordered move list (SAN + UCI)
- FEN per ply

## Invariants
1. All moves must be legal (validated via python-chess)
2. FEN sequence must be reproducible
3. Move order must be preserved
4. game_id must be unique and stable

## Error Handling
- Invalid PGN → abort pipeline
- Partial PGN → flag `incomplete_game = true`

## Validation
- Unit tests with:
  - castling
  - promotion
  - en passant
  - checkmate
- FEN reconstruction tests

## Evidence
- PGN hash
- move count
- parsing logs