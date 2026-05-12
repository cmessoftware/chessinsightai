## Context

El módulo AI Chess Coach ya describe PGN Intake y Feature Extraction en `3-specs`, con entradas/salidas, invariantes y validaciones. Falta traducir estos contratos al formato OpenSpec para habilitar evolución por cambios y archivado estructurado.

## Goals / Non-Goals

**Goals:**
- Definir specs OpenSpec para `pgn-intake` y `feature-extraction` con requisitos testables.
- Preservar fidelidad semántica respecto a `02_pgn_intake_spec.md` y `03_feature_extraction_spec.md`.
- Establecer tareas para adopción incremental sin bloquear otras capacidades.

**Non-Goals:**
- Implementar cambios de código en parsing o feature engineering.
- Migrar todas las specs de `3-specs` en este mismo change.
- Rediseñar el pipeline global del sistema.

## Decisions

1. Crear dos capacidades nuevas separadas: `pgn-intake` y `feature-extraction`.
Rationale: respeta separación de responsabilidades y facilita validación y cambios independientes.

2. Expresar contratos en lenguaje normativo SHALL/MUST con escenarios WHEN/THEN.
Rationale: asegura verificabilidad y compatibilidad con validación OpenSpec.

3. Mantener trazabilidad con documentos fuente en proposal y tareas.
Rationale: evita deriva entre especificación histórica y nueva gobernanza.

4. Adoptar migración incremental por capability.
Rationale: reduce riesgo de errores al transformar especificaciones narrativas a requisitos formales.

## Risks / Trade-offs

- Riesgo: diferencias de interpretación al transformar invariantes a requisitos atómicos.
  Mitigación: revisión cruzada contra documentos fuente y matriz de verificación.
- Trade-off: mantener temporalmente dos representaciones (`3-specs` y OpenSpec) añade costo de mantenimiento.
- Riesgo: escenarios incompletos para casos límite.
  Mitigación: incluir tareas para ampliar cobertura de pruebas (castling, promotion, en passant, benchmarks conocidos).
