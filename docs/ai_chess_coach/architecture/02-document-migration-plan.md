# Documentation Migration Plan

## Source

Legacy architecture docs currently live under:

- `docs/ai_chess_coach/obsoletes-specs/orchestrated-architecture`

## Target

All active architecture documentation must be split by domain under:

- `docs/architecture`
- `docs/modules`
- `docs/roadmap`
- `docs/testing`
- `docs/devops`
- `docs/observability`
- `docs/research`

## Migration Steps

1. Freeze legacy documents as reference-only.
2. Extract reusable technical content into the new domain taxonomy.
3. Update all cross-links from old paths to new paths.
4. Attach aliases, labels, owners, and phase to each migrated artifact.
5. Archive stale documents under `obsoletes-specs`.

## Completion Criteria

- No active docs depend on `obsoletes-specs` links.
- New docs contain roadmap + testing + rollback sections.
- Issue generation templates are in place.
