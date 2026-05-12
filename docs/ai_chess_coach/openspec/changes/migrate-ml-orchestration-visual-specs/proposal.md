## Why

Las especificaciones de clasificación ML, orquestación de análisis, visualización y gobierno de validación (criterios y matriz) siguen fuera del modelo operativo de OpenSpec. Migrarlas completa el núcleo de trazabilidad y deja la evolución de requisitos bajo un flujo uniforme por change.

## What Changes

- Se migran a OpenSpec las capacidades de `ml-classification`, `orchestrated-analysis`, `planner`, `executor`, `critic`, `memory-profile` e `insights-visualization`.
- Se formalizan capacidades transversales de `acceptance-gates` y `verification-matrix` para criterios de calidad y compliance.
- Se transforma el contenido de 3-specs en requisitos normativos SHALL/MUST con escenarios testables WHEN/THEN.
- Se define checklist de adopción para validar consistencia entre nuevas specs OpenSpec y documentación fuente.

## Capabilities

### New Capabilities
- `ml-classification`: Contrato de inferencia de calidad de jugada con confianza, probabilidades y explicabilidad SHAP.
- `orchestrated-analysis`: Flujo controlado planner-executor-critic-memory para generar insights verificables.
- `planner`: Planificación determinística de focos de análisis basada en severidad y continuidad.
- `executor`: Ejecución de tareas de análisis con evidencia estructurada y merge determinístico.
- `critic`: Validación anti-hallucination de claims con estados VERIFIED/WARNING/REJECTED.
- `memory-profile`: Persistencia longitudinal de patrones y agregados normalizados por jugador.
- `insights-visualization`: Presentación de insights validados sin derivar lógica analítica nueva.
- `acceptance-gates`: Criterios funcionales, de validación, performance y calidad para aceptación del sistema.
- `verification-matrix`: Reglas trazables de compliance por spec, evidencia y estado.

### Modified Capabilities
- None.

## Impact

- Documentación: incorporación de múltiples specs en `openspec/changes/migrate-ml-orchestration-visual-specs/specs/`.
- Proceso: consolidación del modelo OpenSpec para casi todo AI Chess Coach.
- Calidad: mayor control de consistencia entre evidencia, inferencia ML e insights.
- Implementación: sin cambios de runtime en esta iteración; foco en contratos y gobernanza.
