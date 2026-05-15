## ADDED Requirements

### Requirement: OpenSpec change workflow for AI Chess Coach
El equipo SHALL crear y mantener cualquier cambio de especificación de AI Chess Coach mediante un change de OpenSpec con artefactos completos (`proposal.md`, `design.md`, `specs`, `tasks.md`) antes de implementaciones asociadas.

#### Scenario: New change is proposed
- **WHEN** se identifica una modificación o nueva capacidad para AI Chess Coach
- **THEN** se crea un change de OpenSpec en `docs/ai_chess_coach/openspec/changes/<change-name>/`
- **AND** el change incluye propuesta, diseño, deltas de requerimientos y tareas rastreables

### Requirement: Standardized OpenSpec execution environment
Las ejecuciones de OpenSpec para AI Chess Coach MUST realizarse desde el entorno `mamba` `chess_trainer` usando `npx -y @fission-ai/openspec` para garantizar reproducibilidad local.

#### Scenario: Team member executes OpenSpec command
- **WHEN** un miembro del equipo necesita listar, validar o crear artefactos de OpenSpec
- **THEN** ejecuta comandos con `mamba run -n chess_trainer npx -y @fission-ai/openspec <command>`
- **AND** los resultados se generan en la raíz `docs/ai_chess_coach`

### Requirement: Traceability between 3-specs and OpenSpec changes
Cada change de OpenSpec relacionado con AI Chess Coach SHALL referenciar explícitamente qué documentos de `docs/ai_chess_coach/3-specs` son impactados y cómo se reflejan los deltas.

#### Scenario: Change impacts existing functional specification
- **WHEN** un change modifica comportamiento descrito en `3-specs`
- **THEN** el artefacto de propuesta identifica los documentos afectados
- **AND** el artefacto de tareas incluye una actividad para actualizar o reconciliar la documentación en `3-specs`
