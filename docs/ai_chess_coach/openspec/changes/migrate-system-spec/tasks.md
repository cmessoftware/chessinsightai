## 1. System Capability Setup

- [ ] 1.1 Confirmar estructura del change `migrate-system-spec` con `openspec status --change migrate-system-spec`
- [ ] 1.2 Verificar alineación de `proposal.md` y `design.md` con la Spec 01 original

## 2. Global Contract Validation

- [ ] 2.1 Revisar `specs/system-pipeline/spec.md` para asegurar cobertura de propósito, alcance, entradas y salidas
- [ ] 2.2 Verificar invariantes globales (evidence, model metadata, determinismo, estados de critic)
- [ ] 2.3 Validar campos obligatorios de trazabilidad (`game_id`, `trace_id` y referencias asociadas)

## 3. Cross-Spec Consistency

- [ ] 3.1 Confirmar consistencia con capacidades ya migradas en changes previos
- [ ] 3.2 Revisar que UI solo expone insights critic-approved (VERIFIED/WARNING)
- [ ] 3.3 Verificar que requisitos de evidencia mínima están presentes en pipeline global

## 4. Final Validation

- [ ] 4.1 Ejecutar `openspec validate migrate-system-spec`
- [ ] 4.2 Ejecutar `openspec list` y confirmar visibilidad del nuevo change
- [ ] 4.3 Documentar cierre de migración completa de `3-specs` a OpenSpec
