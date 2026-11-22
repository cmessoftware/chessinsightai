# ChessDash — revisión de novedades y consistencia del roadmap

**Fecha de revisión:** 2026-11-21 (UTC-3)  
**Última integración observada en la revisión:** PR [#277](https://github.com/cmessoftware/chessinsightai/pull/277) (2026-11-20)  
**Uso:** brief para agente Cursor — verificar estado actual antes de modificar archivos.

## Resumen ejecutivo

ChessDash avanzó en funciones para la beta; la **validación pedagógica sigue pendiente**. Esta nota confirma estados y documentación en el repositorio; **no acredita** funcionamiento end-to-end en producción.

La beta gana utilidad para gestionar, estudiar y comparar partidas, pero falta evidencia para considerar validado el diferencial docente: detectar cuándo detenerse, presentar candidatas correctas y fundamentar la criticidad. **Sparring Maia** y la ampliación del **análisis profundo** siguen como trabajo pendiente (diseño ≠ integrado).

### Novedades integradas (referencia)

| Área | PR / ítem | Novedad | Impacto |
|------|-----------|---------|---------|
| Estudios | [#267](https://github.com/cmessoftware/chessinsightai/pull/267) | Guardar posición y variantes en Partidas; también desde el cursor de una partida | Material de estudio independiente |
| Editor FEN | [#266](https://github.com/cmessoftware/chessinsightai/pull/266) | Paleta de piezas; validación relajada | Preparar posiciones sin empezar desde la inicial |
| Acceso beta | [#264](https://github.com/cmessoftware/chessinsightai/pull/264) | Invitación por enlace y cuenta individual | Acceso beta planteado por producto |
| Búsqueda | [#277](https://github.com/cmessoftware/chessinsightai/pull/277) | Nombres PGN por tokens; orden libre; AND blancas+negras | «Robert Fischer» ↔ «Fischer, Robert James» |
| Reportes | [#259](https://github.com/cmessoftware/chessinsightai/pull/259), [#260](https://github.com/cmessoftware/chessinsightai/pull/260), [#261](https://github.com/cmessoftware/chessinsightai/pull/261) | Menú, ranking, precisión por ritmo, rival, jobs, Markdown/PDF | Módulo reportes con entregas base |
| Roadmap admin | [#268](https://github.com/cmessoftware/chessinsightai/pull/268) | Resumen de pendientes; parser Sparring/DEEP | Consulta del backlog |

### Hallazgos relevantes

| Hallazgo | Consecuencia |
|----------|----------------|
| [#269](https://github.com/cmessoftware/chessinsightai/pull/269) / [#270](https://github.com/cmessoftware/chessinsightai/pull/270): importación y clasificación incorrecta de ritmos Lichess | Filtros, reportes y selección de partidas para entrenamiento pueden contaminarse; **no se encontró corrección integrada** en main al 21/11 |
| **FEAT-122** con dos significados | [#274](https://github.com/cmessoftware/chessinsightai/pull/274): historial de reportes; [#275](https://github.com/cmessoftware/chessinsightai/pull/275): imágenes en GitHub — **colisión de ID entre ramas/PRs** |
| Issue [#276](https://github.com/cmessoftware/chessinsightai/issues/276): adjuntos `localhost:8000` | Enlaces válidos solo en la máquina de quien abre el issue; no evidencia de adjuntos públicos |
| Documentación inconsistente | Changelog aún sugiere reportes «pendiente» pese a #259–261; resumen compact declara Mental 1600 sin pendientes pero lista MENT-* bajo Coach UI |

**Imágenes en comentarios:** especificación en [#273](https://github.com/cmessoftware/chessinsightai/pull/273); implementación en [#275](https://github.com/cmessoftware/chessinsightai/pull/275) (abierto en la revisión, `mergeable=false`). Historial y respuestas bidireccionales = **diseño** (FEAT-123/124), no entrega.

---

## Objetivo del trabajo

Revisar el estado actual del repositorio y **resolver inconsistencias** entre implementación, PRs, changelog y roadmap.

---

## Reglas de trabajo

- Distinguir: **documentado**, **implementado en rama**, **integrado en main**, **validado en producción**.
- No marcar una funcionalidad como terminada solo por existir spec o PR abierto.
- Mantener la **numeración consecutiva compartida** entre BUG y FEAT del [tracker general](../designs/issues-coach-move-classification-pedagogy-mini-plan.md).
- No renumerar IDs existentes sin actualizar **todas** las referencias.
- Conservar trabajo ajeno; no reescribir documentos desde versiones antiguas.
- **No** integrar PRs ni desplegar automáticamente.

---

## 1. Funcionalidades integradas de referencia

| PR | Funcionalidad |
|----|----------------|
| #264 | Invitaciones por enlace y creación de cuentas individuales |
| #266 | Paleta de piezas y edición de posiciones FEN |
| #267 | Guardar posiciones y variantes como estudios en Partidas |
| #268 | Resumen de pendientes y parser de tablas Sparring/DEEP |
| #277 | Filtro avanzado por palabras del nombre PGN (sin orden fijo); AND entre blancas y negras |
| #259 | Menú de reportes, ranking por ritmo, exportación Markdown/PDF |
| #260 | Precisión por ritmo y cálculo en segundo plano |
| #261 | Comparación de ranking y precisión con un rival |

La integración en main **no demuestra** validación E2E en producción.

---

## 2. Colisión de identificadores entre PRs

Estado observado en la revisión:

| PR | Uso de IDs |
|----|------------|
| #274 | BUG-121 (ritmos Lichess); FEAT-122 (historial/seguimiento de reportes) |
| #275 | FEAT-120 (adjuntos); FEAT-121 (confirmación); FEAT-122 (imágenes en GitHub); FEAT-123/124 (diseño hilo y cierre admin) |

### Trabajo requerido

1. Comparar `main` con las ramas de #274 y #275.
2. Verificar la regla del tracker sobre numeración compartida BUG/FEAT.
3. Detectar **todas** las colisiones (incluido **121**).
4. Asignar identificadores únicos según la secuencia vigente.
5. Actualizar roadmap, diseños, changelog, código y pruebas cuando corresponda.
6. Ejecutar `npm run roadmap:sync-pending`.

No resolver la colisión **solo** renombrando el título de un PR.

---

## 3. Adjuntos de imágenes y estado de feedback

| Elemento | Estado en revisión |
|----------|-------------------|
| #273 | Integrado — documentación FEAT-120 |
| #275 | Abierto, no integrado; `mergeable=false` |
| #276 | Adjuntos con URL `http://localhost:8000/api/feedback/attachments/...` |

### Trabajo requerido

- Estado actual de #275 y bloqueos de merge.
- Construcción de URLs de adjuntos (evitar `localhost` en issues para terceros).
- GitHub Contents API (`.feedback/attachments/`) y fallback `FEEDBACK_ATTACHMENT_PUBLIC_BASE_URL`.
- Si falla la publicación: informar sin presentar el adjunto como disponible externamente.
- No documentar historial/respuestas/cierre como **entregados** si son FEAT-123/124 (spec).

### Validación

- [ ] Envío sin imágenes
- [ ] Envío con imágenes; visualización desde otra sesión / otro usuario
- [ ] Fallo de publicación de adjuntos (mensaje claro)
- [ ] Confirmación con enlace al issue
- [ ] «Enviar otro comentario» restaura el formulario
- [ ] `pytest` feedback y adjuntos

**Specs:** [`feat-120-122-feedback-comentarios.md`](../designs/feat-120-122-feedback-comentarios.md), [`feat-123-124-feedback-github-issues.md`](../designs/feat-123-124-feedback-github-issues.md).

---

## 4. Importación y clasificación de ritmos de Lichess

| Reporte | Síntoma |
|---------|---------|
| #269 | Seleccionar correspondencia importó partida rápida |
| #270 | Correspondencia como ultrabullet; rápidas como correspondencia |

### Trabajo requerido

- ¿Misma causa raíz en ambos?
- Filtros a API Lichess, campos de respuesta, normalización de `speed_class` / ritmo.
- `TimeControl` y correspondencia.
- ¿Migración o corrección de datos ya persistidos?
- No asumir equivalencia Lichess ↔ Chess.com sin normalización explícita.

### Validación

Ritmos: bullet, blitz, rapid, classical, correspondence. Controles: `600+0`, `600+5`, `900+10`. Comprobar **selección en import**, **persistencia**, **filtros Partidas** y **reportes**.

---

## 5. Inconsistencias documentales

### Changelog

- Corregir frases que impliquen que «Reportes sigue pendiente» frente a entregas #259–261.
- **Integrados:** ranking por ritmo, precisión por ritmo, comparación con rival.
- **Pendientes (tracker):** aperturas, rachas, survivorship bias (RPT-FEAT-06…08).

### Resumen de pendientes

Archivo: [`roadmap-pending-checklist-compact.md`](../roadmap-pending-checklist-compact.md).

Problemas observados:

- «Mental 1600: sin ítems pendientes» vs MENT-BUG / MENT-FEAT listados bajo Coach UI.
- Posible **doble conteo** de IDs SPAR en secciones «plan» y «servidor».

Revisar `scripts/sync-roadmap-pending-checklist.mjs`:

- Agrupación correcta por módulo.
- No declarar módulo sin pendientes si sus IDs aparecen en otra sección.
- Distinguir filas vs identificadores únicos.

---

## 6. Pendientes críticos — conservar estado real

| ID | Problema |
|----|----------|
| DB-BUG-05 | Reanálisis puede duplicar críticas o dejar resultados parciales |
| BUG-117 | Spinner no sigue el trabajo de análisis profundo |
| BUG-118 | Puntaje ausente mostrado como `0.0` |
| BUG-103 | Descripción editada en Partidas se revierte al abrir |
| MENT-BUG-04 | Taxonomía de candidatas; amenaza D2 con turno incorrecto |
| MENT-BUG-05 | E10: «evaluaciones cercanas» por contar candidatas |
| MENT-BUG-07 | Posible desalineación FEN/bando vs decisión explicada |
| FEAT-119 | Tap origen/destino en móvil |

No cerrar sin evidencia de corrección y validación.

Sparring Maia y análisis profundo: mantener **diseño** vs **integrado**.

---

## Entrega esperada (agente)

1. Documentar estado **verificado hoy** y diferencias respecto de este informe (2026-11-21).
2. Corregir inconsistencias documentales y de identificadores.
3. Problemas funcionales: causa confirmada o «evidencia faltante»; no afirmar causas sin inspección.
4. Ejecutar verificaciones acordes a cada cambio.
5. `npm run roadmap:sync-pending`.
6. **Un PR** con cambios, validación realizada y pendientes explícitos.
7. **No** merge ni deploy.

---

## Fuentes

| Recurso | Enlace / ruta |
|---------|----------------|
| Tracker UI Coach | [`issues-coach-move-classification-pedagogy-mini-plan.md`](../designs/issues-coach-move-classification-pedagogy-mini-plan.md) |
| Índice diseños / specs | [`designs/index.md`](../designs/index.md) |
| Checklist pendientes | [`roadmap-pending-checklist.md`](../roadmap-pending-checklist.md) |
| Changelog producto | [`CHANGELOG.md`](../../../../CHANGELOG.md) (raíz repo) |
| PRs citados | #264, #266, #267, #268, #269, #270, #273, #274, #275, #276, #277, #259, #260, #261 |
| Deep analysis / Sparring | [`deep_analysis/index.md`](../deep_analysis/index.md) |

---

## Exportar a PDF

Desde VS Code/Cursor: extensión **Markdown PDF** o `npx md-to-pdf` sobre este archivo. Mantener este `.md` como fuente canónica; el PDF es vista de lectura.

---

## Verificación 2026-11-22 (UTC-3)

**Comando:** `git fetch origin main` · `gh pr view` · `gh issue view` · lectura de tracker en `origin/main` vs working tree local.

### `origin/main`

| Campo | Valor |
|-------|--------|
| **HEAD** | `033b18e` |
| **Mensaje** | Merge pull request **#277** (`BUG-125`, filtro jugador por tokens) |
| **Fecha merge** | 2026-11-20 16:14 -0300 |

**Respecto del informe 21/11:** sigue siendo cierto que la última integración en main es **#277** (no hay merges posteriores en main al 22/11).

### PRs citados

| PR | Estado | Integrado (`mergedAt` UTC) | Notas |
|----|--------|---------------------------|--------|
| #259 | MERGED | 2026-11-13 | Reportes menú / ranking |
| #260 | MERGED | 2026-11-14 | Precisión por ritmo |
| #261 | MERGED | 2026-11-16 | Comparación rival |
| #264 | MERGED | 2026-11-18 | Invitaciones |
| #266 | MERGED | 2026-11-19 | FEN / paleta |
| #267 | MERGED | 2026-11-19 | Estudios en Partidas |
| #268 | MERGED | 2026-11-19 | Checklist resumen |
| #273 | MERGED | 2026-11-20 | **Solo documentación** FEAT-120 (spec inicial) |
| #274 | **CLOSED** (no merge) | — | Propuso **BUG-121** + **FEAT-122** (ritmos Lichess / historial reportes). **No está en main.** |
| #275 | **OPEN** | — | `mergeable`: **CONFLICTING**. CI **Coach MVP (P0-1) FAIL** (2026-11-20): `test_spa_fallback_routes.py` (esperaba `missing`, obtuvo `rewrite`). |
| #277 | MERGED | 2026-11-20 | BUG-125 |
| #278 | **OPEN** | — | FEAT-127 multiselect categorías (sin merge) |

**#269 / #270** del informe son **issues**, no PRs: [#269](https://github.com/cmessoftware/chessinsightai/issues/269) **CLOSED**; [#270](https://github.com/cmessoftware/chessinsightai/issues/270) **OPEN** («Problema tipo de partidas»). No hay PR de corrección de ritmos Lichess mergeado en main.

### Issues feedback

| Issue | Estado | Nota |
|-------|--------|------|
| [#276](https://github.com/cmessoftware/chessinsightai/issues/276) | OPEN | Título «Bug test»; el informe sobre `localhost:8000` en adjuntos sigue siendo relevante hasta validar #275 + Contents API en prod. |
| [#271](https://github.com/cmessoftware/chessinsightai/issues/271) | OPEN | Sugerencia «Lista de reporte de bugs» (relacionada con el FEAT-122 de #274 no mergeado). |

### Colisión FEAT-122 / BUG-121 (resolución documental 22/11)

| ID canónico en tracker | Origen | Contenido |
|------------------------|--------|-----------|
| **FEAT-120…122** | **#275** | Comentarios en análisis (UI + GitHub) — **⬜ Todo** hasta merge #275 |
| **BUG-128** | Ex-**#274** «BUG-121» | Ritmos / clase de velocidad import Lichess |
| **FEAT-128** | Ex-**#274** «FEAT-122» | Historial de reportes (#271) |

Ver [`roadmap-id-collisions-2026-11.md`](../designs/roadmap-id-collisions-2026-11.md).

### Documentación (cambios en rama `docs/roadmap_consistency_2026-11-22`)

| Hallazgo informe | Acción |
|------------------|--------|
| `CHANGELOG.md`: «Reportes sigue pendiente» | Aclarado RPT-FEAT-01…05 vs 06…08 |
| Tracker cabecera Reportes mixto | Párrafo mixto RPT-01…05 integrados / 06…08 pendientes |
| Mental 1600 vacío en checklist | Nota MENT-* en Coach UI (`sync-roadmap-pending-checklist.mjs`) |
| SPAR duplicado en checklist | Dedupe por ID en el generador |
| Specs FEAT-120+ / BUG-128 / FEAT-128 | Añadidas en `designs/` + índice |

**Pendiente de código:** merge **#275**, **#278**; ritmos Lichess (**BUG-128**); historial reportes (**FEAT-128**).

**Validación en producción:** no realizada en esta verificación.