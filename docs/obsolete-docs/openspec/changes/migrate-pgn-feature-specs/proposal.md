## Why

Las especificaciones de ingestión PGN y extracción de features existen en `docs/ai_chess_coach/3-specs`, pero no están modeladas como capacidades OpenSpec versionables por change. Migrarlas permite trazabilidad por requisito, validación consistente y ejecución de cambios incremental.

## What Changes

- Se crea capacidad OpenSpec `pgn-intake` con requerimientos normativos para parseo, legalidad de jugadas y reconstrucción reproducible.
- Se crea capacidad OpenSpec `feature-extraction` con requerimientos normativos para generación de features por ply y reglas de consistencia.
- Se define el mapeo explícito entre documentos fuente (`02_pgn_intake_spec.md`, `03_feature_extraction_spec.md`) y nuevos spec del change.
- Se establece checklist de adopción y validación para dejar ambas capacidades listas para iteraciones futuras.

## Capabilities

### New Capabilities
- `pgn-intake`: Parseo determinístico de PGN a estructura de partida con validaciones de legalidad y evidencia.
- `feature-extraction`: Extracción determinística de variables por jugada con invariantes de completitud y consistencia.

### Modified Capabilities
- None.

## Impact

- Documentación: se agregan specs en `openspec/changes/migrate-pgn-feature-specs/specs/`.
- Proceso: la evolución de estas dos áreas pasa a gestionarse por OpenSpec.
- Calidad: mejora auditabilidad al expresar SHALL/MUST y escenarios WHEN/THEN.
- Runtime: sin impacto directo de código en esta iteración (cambio documental y de gobernanza).
