## Requirements

### Requirement: Deterministic PGN parsing
The system SHALL parse a PGN input (string or file, UTF-8) into deterministic structured game data containing `game_id`, game metadata, ordered move list (SAN and UCI), and FEN per ply.

#### Scenario: Valid PGN is parsed
- **WHEN** a syntactically valid PGN is provided
- **THEN** the parser emits metadata, SAN/UCI move sequence, and FEN sequence preserving original move order
- **AND** a unique stable `game_id` is assigned to the parsed game

### Requirement: Move legality enforcement
All parsed moves MUST be validated as legal chess moves using the configured chess legality engine before the pipeline continues.

#### Scenario: Illegal move is detected
- **WHEN** at least one move in the PGN is illegal
- **THEN** parsing is rejected and the pipeline is aborted for that game

### Requirement: Reproducible FEN reconstruction
The generated FEN sequence SHALL be reproducible from the same PGN and parser configuration.

#### Scenario: Same PGN parsed twice
- **WHEN** the same PGN and parser configuration are executed multiple times
- **THEN** the resulting ordered FEN sequence is identical across runs

### Requirement: Explicit handling of incomplete games
The parser MUST flag partial PGN data with `incomplete_game = true` without silently dropping uncertainty.

#### Scenario: Partial game notation received
- **WHEN** PGN content is parseable but incomplete
- **THEN** output includes `incomplete_game = true`
- **AND** emitted fields preserve all successfully parsed moves and positions

### Requirement: Parsing evidence output
The parsing stage SHALL emit minimal evidence artifacts including PGN hash, move count, and parsing logs.

#### Scenario: Parsing completes
- **WHEN** a PGN is parsed successfully or flagged incomplete
- **THEN** evidence artifacts include PGN hash, total parsed move count, and parser logs tied to the game identifier
