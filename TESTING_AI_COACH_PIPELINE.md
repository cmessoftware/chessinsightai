# Testing AI Coach Pipeline - Quick Guide

## Prerequisites

1. **PostgreSQL running:**
   ```powershell
   docker-compose up -d postgres
   ```

2. **Conda environment activated:**
   ```powershell
   conda activate chess_trainer
   ```

## Step 1: Find Games with Analysis

```powershell
# List all games with analysis
python list_analyzed_games.py

# Filter by source (stockfish games - robot vs robot)
python list_analyzed_games.py --source stockfish

# Filter by player name
python list_analyzed_games.py --player sergio

# Combine filters (personal games of a specific player)
python list_analyzed_games.py --source personal --player magnus

# Show more results
python list_analyzed_games.py --limit 50

# Multiple filters
python list_analyzed_games.py --source stockfish --player Base-b4c239b --limit 10
```

**Available filters:**

**--source:** Filter by game source
- `stockfish` - Games between chess engines (robot vs robot)
- `personal` - Your uploaded games
- `elite` - Master/GM level games
- `novice` - Beginner/intermediate games
- `fide` - Official FIDE tournament games

**--player:** Filter by player name (searches both white and black)
- Example: `--player cmess1315` finds games where "cmess1315" played as white or black
- **Exact match:** Must use the complete player name (e.g., "cmess" won't find "cmess1315")

**--limit:** Maximum number of games to show (default: 20)

**Output example:**
```
1. Opening: Sicilian
   Players: Base-b4c239b (W) vs New-9f312c8 (B)
   Source: stockfish
   Analysis: 165/182 moves (91% complete)
   Colors: WHITE=91 moves, BLACK=91 moves
   Game ID: b73806ebf5c0d72a1d0a74ecb6b8a28a6504e2974b1c7907e72af355b9e9ef79
```

**Look for:**
- High % complete (ideally >80%)
- Both WHITE and BLACK moves present
- Copy the full Game ID

### Understanding Analysis Completeness

**What does "42% complete" mean?**

When you see `Analysis: 44/105 moves (42% complete)`, it means:
- The game has **105 total moves** (features created)
- Only **44 moves** have Stockfish analysis completed (`score_diff` and `error_label` populated)
- **61 moves** still need analysis

**Why aren't all games 100% analyzed?**

When PGN files are imported, **basic features** are created (FEN, moves, material), but **Stockfish analysis** is NOT automatic. The analysis requires:
- `score_diff` - Evaluation change calculated by Stockfish
- `error_label` - Classification (blunder/mistake/inaccuracy/good/best)

### Completing the Analysis (0% → 100%)

**Analyze all games:**
```powershell
python src/scripts/generate_features_with_tactics.py
```

**Analyze specific source:**
```powershell
# Stockfish games only (robots)
python src/scripts/generate_features_with_tactics.py --source stockfish

# Your personal games
python src/scripts/generate_features_with_tactics.py --source personal

# Elite/master games
python src/scripts/generate_features_with_tactics.py --source elite
```

**Filter by player:**
```powershell
# Analyze games of a specific player (exact name match)
python src/scripts/generate_features_with_tactics.py --player cmess1315 --max-games 100

# Combine: personal games of a specific player (must use exact name)
python src/scripts/generate_features_with_tactics.py --source personal --player cmess1315 --max-games 50
```

**Optimize for speed (parallel processing):**
```powershell
# Use 4 CPU cores
python src/scripts/generate_features_with_tactics.py --source stockfish --workers 4

# Limit number of games
python src/scripts/generate_features_with_tactics.py --source personal --max-games 100

# Combine: 500 games with 4 workers
python src/scripts/generate_features_with_tactics.py --source personal --max-games 500 --workers 4
```

**Time estimates:**
- 1 game (~40 moves): ~30-60 seconds
- 100 games (1 worker): ~50-100 minutes
- 100 games (4 workers): ~15-30 minutes

**Verify progress:**
```powershell
# Check completion percentage after running analysis
python list_analyzed_games.py --source stockfish --limit 10
```

Look for games with **90-100% complete**.

**Important notes:**
- ✅ **Incremental:** The script only analyzes missing moves, doesn't re-analyze existing data
- ✅ **Resumable:** If interrupted, just run it again - it continues where it left off
- ✅ **Safe:** Won't duplicate or overwrite existing analysis

## Step 2: Analyze a Game

### Analyze WHITE player:
```powershell
python test_coach_pipeline.py --game-id <GAME_ID> --player-color white
```

### Analyze BLACK player:
```powershell
python test_coach_pipeline.py --game-id <GAME_ID> --player-color black
```

### Analyze both players (no color filter):
```powershell
python test_coach_pipeline.py --game-id <GAME_ID>
```

## Step 3: Interpret Results

The report includes:

1. **📖 OPENING ANALYSIS** - Opening name and position eval
2. **📊 PERFORMANCE SUMMARY** - CPL, accuracy, error counts
3. **⚡ TACTICAL INSIGHTS** - Detected patterns (forks, pins, etc.)
4. **🎓 STRATEGIC INSIGHTS** - RAG knowledge from chess books
5. **🔥 CRITICAL MOMENTS** - Top 3 biggest evaluation swings
6. **💡 TRAINING RECOMMENDATIONS** - Personalized advice

### Performance Metrics:

**Average Centipawn Loss (CPL):**
- 0-50: Excellent
- 50-100: Good
- 100-150: Needs improvement
- 150+: Poor performance

**Accuracy:**
- Percentage of "good" or "best" moves
- Higher is better

**Error Types:**
- **Blunder:** Loss >200 centipawns
- **Mistake:** Loss 100-200 centipawns
- **Inaccuracy:** Loss 50-100 centipawns

## Real Example

```powershell
# 1. Find stockfish games (robot vs robot)
python list_analyzed_games.py --source stockfish

# 2. Find games by a specific player
python list_analyzed_games.py --player "Base-b4c239b"

# 3. Find personal games of a specific player
python list_analyzed_games.py --source personal --player sergio

# 4. Copy a Sicilian game ID, analyze WHITE player
python test_coach_pipeline.py --game-id b73806ebf5c0d72a1d0a74ecb6b8a28a6504e2974b1c7907e72af355b9e9ef79 --player-color white
```

**Expected output:**
```
📖 OPENING ANALYSIS
   Sicilian. Position after opening: balanced.

📊 PERFORMANCE SUMMARY
   Needs improvement performance overall. Average centipawn loss: 236.1. Move accuracy: 17.6%.

🔥 CRITICAL MOMENTS (5)
   1. Move 179: Rh7+
      Evaluation swing: 837.0 centipawns
   2. Move 169: Nxf6
      Evaluation swing: 750.0 centipawns
   ...

💡 TRAINING RECOMMENDATIONS
   1. Total errors: 67 - 10 blunder(s), 41 mistake(s), 16 inaccuracy(ies).
   2. Review critical moments and alternative lines
   3. Study similar positions from master games (see RAG insights)
```

## Troubleshooting

### Error: "No features found for game"
- The game ID might be incomplete
- Copy the FULL game ID from `list_analyzed_games.py`
- Or the player color doesn't have moves (check WHITE/BLACK counts)

### Error: "Connection refused"
- PostgreSQL not running
- Run: `docker-compose up -d postgres`
- Wait 5 seconds, try again

### Error: "column games.site does not exist"
- This is a warning, not an error
- Opening detection falls back to tags
- Pipeline continues normally

### No games found with analysis
- Features exist but not analyzed yet
- Run: `python src/scripts/generate_features_with_tactics.py`
- See **"Understanding Analysis Completeness"** section above for details
- This will analyze games with Stockfish (time varies, ~30-60 sec per game)

### Low completion percentage (e.g., 42% complete)
- Only some moves have been analyzed by Stockfish
- Complete the analysis: `python src/scripts/generate_features_with_tactics.py --source <SOURCE>`
- Use `--workers 4` for faster processing (parallel)
- See **"Completing the Analysis"** section above for optimization tips

## Demo Mode

Test with any game automatically:
```powershell
python test_coach_pipeline.py --demo
```

This picks the first game with features in the database.

---

**Last Updated:** 2026-03-15
**Status:** Phase 2 Complete ✅
