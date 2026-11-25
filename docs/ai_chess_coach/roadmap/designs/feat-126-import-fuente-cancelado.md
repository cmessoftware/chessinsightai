# FEAT-126 · Combo Fuente en Importar (cancelado)

**Estado:** 🚫 Cancelado (no implementar).  
**Sustituto:** **FEAT-127** — multiselect de **categorías** al importar ([#278](https://github.com/cmessoftware/chessinsightai/pull/278)).

## Qué se pidió mal (126)

Reemplazar el control de importación por un combo **«Fuente»** alineado al **corpus** de Partidas (`personal`, `elite`, `fide`, …) — confundía **fuente/corpus persistido** con **categorías visuales** (chips Táctica, Torneo, etc.).

## Decisión de producto

- **Categorías** (varias por partida, overrides locales) ≠ **corpus_type** en `coach_games`.
- El usuario quiere etiquetar al importar con las mismas categorías que en Partidas, no solo cambiar corpus.

## Evidencia en tracker

Fila FEAT-126 en [issues-coach-move-classification-pedagogy-mini-plan.md](./issues-coach-move-classification-pedagogy-mini-plan.md): «Revertido en favor de FEAT-127».

## Rama

El trabajo exploratorio usó ids `11_126_*`; la implementación válida es `feature/11_127_import_categories_multiselect` / PR #278.