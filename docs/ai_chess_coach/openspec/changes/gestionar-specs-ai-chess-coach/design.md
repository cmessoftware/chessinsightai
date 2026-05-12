## Context

AI Chess Coach posee una base de especificaciones en `docs/ai_chess_coach/3-specs` (sistema, ingestión PGN, extracción, clasificación, planner/executor/critic/memory, visualización y criterios). OpenSpec fue inicializado en `docs/ai_chess_coach`, pero aún sin artefactos de cambio completos.

La necesidad es estandarizar cómo evolucionan estos requisitos, dejando trazabilidad por cambio y validación estructural antes de aplicar modificaciones.

## Goals / Non-Goals

**Goals:**
- Definir un proceso mínimo reproducible para gestionar especificaciones con OpenSpec.
- Asegurar que cada cambio incluya propuesta, diseño, deltas de requerimientos y checklist de ejecución.
- Mantener coexistencia clara entre `3-specs` (fuente documental actual) y `openspec` (gobernanza de cambio).

**Non-Goals:**
- Reescribir inmediatamente todos los documentos de `3-specs` al formato interno de OpenSpec.
- Cambiar comportamiento del producto o código de runtime en esta iteración.
- Automatizar aún la sincronización bidireccional con scripts.

## Decisions

1. Raíz de OpenSpec en `docs/ai_chess_coach`.
Rationale: mantiene artefactos junto al dominio funcional y evita acoplarlos al resto del monorepo.

2. Ejecución CLI con `mamba run -n chess_trainer npx -y @fission-ai/openspec ...`.
Rationale: asegura consistencia de entorno y evita discrepancias entre shells locales.

3. Introducir la capacidad `spec-governance`.
Rationale: comenzar con una capacidad transversal para institucionalizar el flujo de cambios antes de migrar capacidades funcionales individuales.

4. Estrategia incremental.
Rationale: primero se activa proceso y artefactos; luego se migran capacidades específicas (p. ej. `pgn-intake`, `feature-extraction`) en cambios separados.

## Risks / Trade-offs

- Riesgo: duplicación temporal entre `3-specs` y artefactos OpenSpec.
  Mitigación: definir tareas explícitas de mapeo y actualización disciplinada por cambio.
- Trade-off: adopción incremental reduce riesgo operativo, pero retrasa beneficios de cobertura total inmediata.
- Riesgo: diferencias de criterio al mapear secciones narrativas a requisitos normativos SHALL.
  Mitigación: revisar cada delta con criterios de aceptación y matriz de verificación.
