## Context

Después de migrar PGN Intake y Feature Extraction a OpenSpec, quedan pendientes las capas de clasificación, orquestación, validación crítica, memoria, visualización y gobierno de cumplimiento. Estas piezas son claves para garantizar que los insights sean auditables, determinísticos y sin alucinaciones.

## Goals / Non-Goals

**Goals:**
- Traducir las specs pendientes de `3-specs` a capacidades OpenSpec con contratos verificables.
- Mantener separación de responsabilidades entre componentes de orquestación.
- Formalizar criterios de aceptación y matriz de verificación como capacidades operativas.

**Non-Goals:**
- Reescribir la arquitectura del pipeline existente.
- Implementar optimizaciones de performance o cambios de modelo.
- Sustituir inmediatamente los documentos históricos de `3-specs`.

## Decisions

1. Crear capacidades atómicas por componente (`planner`, `executor`, `critic`, `memory-profile`) además de la capacidad contenedora `orchestrated-analysis`.
Rationale: permite validar responsabilidades y pruebas por módulo sin perder visión de flujo end-to-end.

2. Definir `acceptance-gates` y `verification-matrix` como capacidades explícitas.
Rationale: convierte reglas de calidad en contratos mantenibles por change y no en documentación estática.

3. Mantener enfoque en contratos y escenarios, sin cambios de código en esta fase.
Rationale: reducir riesgo y habilitar implementación posterior guiada por tareas.

4. Conservar trazabilidad con fuentes originales de `3-specs`.
Rationale: facilita auditoría y revisión de fidelidad semántica durante la transición.

## Risks / Trade-offs

- Riesgo de sobre-solapamiento entre capacidad global (`orchestrated-analysis`) y subcomponentes.
  Mitigación: restringir la capacidad global a invariantes de flujo y dejar detalles en capacidades específicas.
- Trade-off de carga documental inicial mayor para ganar control de calidad en iteraciones futuras.
- Riesgo de desalineación temporal con `3-specs` si no se actualiza en paralelo.
  Mitigación: tareas explícitas de reconciliación y validación cruzada.
