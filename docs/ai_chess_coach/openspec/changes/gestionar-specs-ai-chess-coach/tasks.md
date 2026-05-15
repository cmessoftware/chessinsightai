## 1. OpenSpec Baseline

- [x] 1.1 Confirmar que OpenSpec inicializa y corre en `docs/ai_chess_coach` con `mamba run -n chess_trainer npx -y @fission-ai/openspec --help`
- [x] 1.2 Validar que el change `gestionar-specs-ai-chess-coach` existe y aparece en `openspec list`

## 2. Governance Spec Adoption

- [x] 2.1 Revisar `proposal.md` y confirmar capacidades declaradas para este cambio
- [x] 2.2 Revisar `design.md` y validar decisiones técnicas y riesgos
- [x] 2.3 Revisar `specs/spec-governance/spec.md` para asegurar requisitos normativos y escenarios testables

## 3. Mapping With Existing Documentation

- [x] 3.1 Mapear los documentos de `docs/ai_chess_coach/3-specs` a capacidades OpenSpec candidatas
- [x] 3.2 Definir prioridades de migración incremental (ej. `pgn-intake`, `feature-extraction`, `ml-classification`)
- [x] 3.3 Crear change(s) adicionales de OpenSpec para la primera ola de migración

## 4. Validation And Team Workflow

- [x] 4.1 Ejecutar `openspec validate gestionar-specs-ai-chess-coach` y resolver hallazgos
- [x] 4.2 Documentar convención de comandos operativos para el equipo en README interno
- [x] 4.3 Establecer criterio de done: todo cambio de requisitos pasa por OpenSpec antes de implementación
