# BUG-128 · Importación Lichess: ritmo incorrecto

**Estado:** ⬜ Todo  
**Tracker:** [issues-coach-move-classification-pedagogy-mini-plan.md](./issues-coach-move-classification-pedagogy-mini-plan.md)  
**Antecedente:** PR [#274](https://github.com/cmessoftware/chessinsightai/pull/274) propuso **BUG-121** (colisión con **FEAT-121**).  
**Issues:** [#270](https://github.com/cmessoftware/chessinsightai/issues/270), [#269](https://github.com/cmessoftware/chessinsightai/issues/269) (cerrado).

## Síntomas reportados

- Correspondencia clasificada como ultrabullet.
- Rapid clasificada como correspondencia.
- Otros ritmos no verificados en main.

## Alcance

Importación Lichess (FEAT-027), persistencia de `speed_class` / ritmo en Partidas y filtros (FEAT-032, reportes).

## Aceptación

Importar partidas bullet, blitz, rapid, classical y correspondence; validar ritmo tras recarga; controles de prueba `600+0`, `600+5`, `900+10`.

## Validación

Sin corrección integrada en `main` al 2026-11-22 (solo documentación).