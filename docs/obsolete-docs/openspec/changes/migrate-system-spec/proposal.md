## Why

La especificación global del sistema (Spec 01) define invariantes, trazabilidad y alcance end-to-end, pero aún no está formalizada como capacidad OpenSpec. Migrarla cierra la brecha de gobernanza para todo el set de `3-specs`.

## What Changes

- Se crea la capacidad `system-pipeline` en OpenSpec para representar el contrato global del AI Chess Coach.
- Se formalizan invariantes globales, estados de validación, trazabilidad obligatoria y evidencia mínima.
- Se añade checklist de verificación para mantener alineación con capacidades ya migradas (`pgn-intake`, `feature-extraction`, `ml-classification`, etc.).

## Capabilities

### New Capabilities
- `system-pipeline`: Contrato sistémico de propósito, alcance, entradas/salidas, invariantes globales y requisitos transversales de trazabilidad.

### Modified Capabilities
- None.

## Impact

- Completa cobertura de migración de specs núcleo desde `3-specs` a OpenSpec.
- Refuerza coherencia entre capacidades específicas y reglas globales.
- Sin impacto de runtime; cambio documental y de gobernanza de requisitos.
