# Índice · Análisis profundo y sparring (Coach)

**Specs** (comportamiento, fuera de esta carpeta) y **arquitectura / entregas** (implementación, aquí).

Diseños UI: [../designs/index.md](../designs/index.md) · Roadmap Phase 2: [../03-phase-02-analysis-in-product.md](../03-phase-02-analysis-in-product.md)

## Specs (producto)

| Documento | Resumen |
|-----------|---------|
| [spec_analisis_profundo_unificado.md](../../spec_analisis_profundo_unificado.md) | **A** posición async · **B** partida `server_deep_v1` · **C** Lc0 en críticas `lc0_critical_v1`; una plataforma de jobs, SF canónico. |
| [spec_sparring_maia_stockfish_unificado.md](../../spec_sparring_maia_stockfish_unificado.md) | Sparring Maia en servidor, SF post-partida, ejercicios/instructor/progreso; sin mezclar evaluaciones entre motores. |
| [spec_planes_hitl.md](../../spec_planes_hitl.md) | Planes estratégicos y HITL; complemento pedagógico, no reemplaza motores. |

## Arquitectura

| Documento | Resumen |
|-----------|---------|
| [architecture-shared-analysis-platform.md](./architecture-shared-analysis-platform.md) | Jobs, outbox, UCI, registry de motores, evaluación, caché FEN, `module07` — compartido profundo + sparring. |
| [architecture-deep-analysis-module.md](./architecture-deep-analysis-module.md) | Implementación **A/B/C**: workers, persistencia, contraste Lc0 (UCI, entidades, API). |
| [architecture-sparring-maia-module.md](./architecture-sparring-maia-module.md) | Sesiones Maia, SF posterior, eventos, reutiliza plataforma compartida. |
| [arquitectura-candidata-servicios-analisis.md](./arquitectura-candidata-servicios-analisis.md) | Borrador Phase 2: WASM/BackgroundTasks → servidor → Redis/ARQ. |

## Planes de implementación (seguimiento)

| Documento | Resumen |
|-----------|---------|
| [issues-plan-implementacion-analisis-profundo.md](./issues-plan-implementacion-analisis-profundo.md) | **DEEP-01…19** — catálogo A/B/C, ramas, orden sugerido |
| [issues-sparring-maia-server-mini-plan.md](./issues-sparring-maia-server-mini-plan.md) | **SPAR-01…20** — sparring Maia servidor, humanización tiempo bot (Lucas Chess), SF posterior |
| [spar-01-openspec-maia3.md](../devops/spar-01-openspec-maia3.md) | **SPAR-01** ✅ — OpenSpec licencias, `MAIA_*`, cache HF |
| [spar-01-maia-local-windows.md](../devops/spar-01-maia-local-windows.md) | Runbook Maia-3 UCI, smoke local Windows |
| [sources/maia_mocktest.md](./sources/maia_mocktest.md) | Evidencia smoke SPAR-01 |
| [issues-plan-implementacion-sparring-maia.md](./issues-plan-implementacion-sparring-maia.md) | Resumen corto SPAR-01…15 (ver tracker detallado arriba) |

## Entregas, HITL y datos

| Documento | Resumen |
|-----------|---------|
| [coach-async-analysis-server-mini-plan.md](./coach-async-analysis-server-mini-plan.md) | **AS-1…AS-11** — línea principal en worker y cliente server-first. |
| [coach-lc0-strategic-kibitzer-mini-plan.md](./coach-lc0-strategic-kibitzer-mini-plan.md) | **LZ-1…LZ-8** — desglose capacidad **C**. |
| [coach-move-classification-pedagogy-mini-plan.md](./coach-move-classification-pedagogy-mini-plan.md) | **CA-1…CA-9**, **SV-*** — clasificación ply WASM → servidor. |
| [coach-classification-hitl-checklist.md](./coach-classification-hitl-checklist.md) | Gate **CA-8** (badges / impacto). |
| [coach-mental-1600-hitl-checklist.md](./coach-mental-1600-hitl-checklist.md) | Gate **M-11** (mental 1600). |
| [coach-games-catalog-unify-mini-plan.md](./coach-games-catalog-unify-mini-plan.md) | **GC-1…GC-5** — `games` maestro + `coach_games`. |
| [issues-coach-move-classification-pedagogy-mini-plan.md](./issues-coach-move-classification-pedagogy-mini-plan.md) | Issues CA / FEAT trazables (**espejo**; canónico en [`../designs/issues-coach-move-classification-pedagogy-mini-plan.md`](../designs/issues-coach-move-classification-pedagogy-mini-plan.md)). |

Fuentes históricas (no planificar): [sources/](./sources/)
