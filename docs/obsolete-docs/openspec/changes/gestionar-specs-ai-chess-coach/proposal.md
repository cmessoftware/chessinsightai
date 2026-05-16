## Why

Las especificaciones funcionales de AI Chess Coach ya existen en `docs/ai_chess_coach/3-specs`, pero hoy no tienen un flujo de cambios formal y trazable. Integrarlas con OpenSpec permite proponer, revisar, validar y archivar cambios de forma consistente.

## What Changes

- Se define un flujo operativo para gestionar cambios de requisitos de AI Chess Coach usando OpenSpec desde el entorno `mamba` `chess_trainer`.
- Se establece la carpeta `docs/ai_chess_coach` como raíz de trabajo de OpenSpec para mantener cerca los artefactos de cambios y los documentos de producto existentes.
- Se incorpora una capacidad de gobernanza de especificaciones para sincronizar cambios entre `openspec/` y `3-specs`.
- Se documenta la forma estándar de ejecución CLI: `mamba run -n chess_trainer npx -y @fission-ai/openspec ...`.

## Capabilities

### New Capabilities
- `spec-governance`: Flujo normativo para crear, revisar, validar y mantener especificaciones de AI Chess Coach mediante OpenSpec y su relación con `3-specs`.

### Modified Capabilities
- Ninguna capacidad existente fue modificada en este cambio.

## Impact

- Procesos: formaliza gestión de cambios de specs para AI Chess Coach.
- Documentación: agrega artefactos de propuesta, diseño, especificación y tareas en `docs/ai_chess_coach/openspec/changes/...`.
- Operación local: requiere Node/NPM y acceso a entorno `mamba` `chess_trainer` para ejecutar la CLI de OpenSpec.
- Riesgo bajo: no modifica runtime de aplicación, sólo el proceso y documentación de especificaciones.
