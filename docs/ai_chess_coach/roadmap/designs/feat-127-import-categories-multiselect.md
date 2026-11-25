# FEAT-127 · Multiselect categorías al importar

**Estado:** ✅ Done ([#278](https://github.com/cmessoftware/chessinsightai/pull/278)).  
**Tracker:** FEAT-127 en [issues-coach-move-classification-pedagogy-mini-plan.md](./issues-coach-move-classification-pedagogy-mini-plan.md)  
**Relacionado:** FEAT-025, FEAT-064, FEAT-078, FEAT-101; cancela FEAT-126.

## Objetivo

Al importar partidas (PGN texto/archivo, Lichess, Chess.com), el usuario puede elegir **una o más categorías** (mismas definiciones que Partidas) que se aplican a **todas** las partidas del lote. Opcional: vacío = solo categoría automática por reglas existentes.

## Comportamiento

1. **UI:** `CoachImportCategoriesSelect` (MUI `Autocomplete` múltiple) en:
   - `PgnImportPanel`
   - `LichessImportPanel`
   - `ChesscomImportPanel`
   - `CoachImportarPage` / `UnifiedImportPage` según flujo activo.
2. **Persistencia local:** overrides en `localStorage` clave `coach.partidas.categoryOverrides.v2` — mapa `gameId → string[]` (migración automática desde `v1` de un solo id).
3. **Merge al importar:** tras recibir ids de partidas del backend, `mergeCoachGameCategoryOverrides` fusiona las categorías elegidas con cualquier override previo del juego (sin duplicar ids).
4. **Partidas:** listado y filtros siguen usando `getCoachGameCategoryOverrideIds` / chips múltiples (`coachGameCategory.js`).

## No hace (alcance)

- No cambia `corpus_type` / Fuente persistida en Postgres por este control (ver FEAT-101 / bulk corpus).
- No sustituye categoría automática cuando el multiselect va vacío.

## Aceptación

- [x] Importar con 0, 1 o N categorías; recargar Partidas y ver chips correctos.
- [x] Segunda importación del mismo `gameId` acumula categorías sin perder las anteriores (merge).
- [x] Tests en `coachGameCategoryOverrides.test.js` y `coachGameCategory.test.js`.

## Código principal

| Pieza | Ruta |
|-------|------|
| Multiselect | `src/frontend/src/components/coach/CoachImportCategoriesSelect.jsx` |
| Overrides v2 | `src/frontend/src/utils/coachGameCategoryOverrides.js` |
| Categorías | `src/frontend/src/utils/coachGameCategory.js` |
| Config chips | `coachGameCategoriesConfig` (ids habilitados, sin `fallback`) |

## Rama histórica

`feature/11_126_import_fuente` (#278) — nombre de rama por confusión inicial con FEAT-126; el merge cerró FEAT-127.