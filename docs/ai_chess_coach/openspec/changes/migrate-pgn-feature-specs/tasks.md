## 1. Capability Migration Baseline

- [ ] 1.1 Revisar `proposal.md` del change y confirmar alcance en `pgn-intake` y `feature-extraction`
- [ ] 1.2 Validar estructura de artefactos con `openspec status --change migrate-pgn-feature-specs`

## 2. PGN Intake Capability

- [ ] 2.1 Verificar que `specs/pgn-intake/spec.md` cubre entradas, salidas e invariantes de legalidad y reproducibilidad
- [ ] 2.2 Confirmar escenarios para PGN inválido y PGN parcial (`incomplete_game = true`)
- [ ] 2.3 Definir mapeo de evidencia mínima: hash PGN, move count y parsing logs

## 3. Feature Extraction Capability

- [ ] 3.1 Verificar que `specs/feature-extraction/spec.md` cubre features por ply y regla `score_diff = score_after - score_before`
- [ ] 3.2 Confirmar escenarios de consistencia para valores faltantes explícitos (`null`) y claves de trazabilidad (`game_id`, `ply`, `FEN`)
- [ ] 3.3 Asegurar cobertura de validación por tests unitarios, rangos estadísticos y benchmarks

## 4. Validation And Adoption

- [ ] 4.1 Ejecutar `openspec validate migrate-pgn-feature-specs` y resolver hallazgos
- [ ] 4.2 Alinear `3-specs` con referencias a capacidades OpenSpec para evitar divergencia
- [ ] 4.3 Preparar siguiente change para migrar `ml-classification`
