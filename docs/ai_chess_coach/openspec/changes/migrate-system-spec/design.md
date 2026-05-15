## Context

Las capacidades específicas ya migradas requieren un marco sistémico único que gobierne flujo, invariantes y trazabilidad. La Spec 01 funciona como capa contractual superior para todo el pipeline: parsing -> features -> ML -> orchestration -> validation -> visualization.

## Goals / Non-Goals

**Goals:**
- Capturar en OpenSpec el contrato global del pipeline AI Chess Coach.
- Expresar reglas transversales como requisitos normativos verificables.
- Alinear criterios de trazabilidad y evidencia con capacidades ya migradas.

**Non-Goals:**
- Rediseñar arquitectura existente o dependencias de ejecución.
- Duplicar detalles internos de capacidades ya especificadas en cambios previos.
- Introducir cambios de código en esta iteración.

## Decisions

1. Crear capacidad `system-pipeline` como capa de gobernanza transversal.
Rationale: centraliza reglas globales y evita dispersión de invariantes críticos.

2. Limitar la spec de sistema a contrato e invariantes, no a detalles de implementación.
Rationale: mantener separación de preocupaciones y evitar redundancia con capacidades hijas.

3. Mantener vínculo explícito a estados de critic (`VERIFIED`, `WARNING`, `REJECTED`) y política de visualización.
Rationale: protege requisito anti-hallucination de forma end-to-end.

## Risks / Trade-offs

- Riesgo de duplicación parcial con specs de componentes.
  Mitigación: formular requisitos globales y referenciar capacidades específicas para detalle operativo.
- Trade-off: mayor disciplina documental a cambio de mejor auditabilidad.
- Riesgo de desalineación futura entre capa global y specs de módulo.
  Mitigación: incluir tareas de reconciliación en cada cambio relevante.
