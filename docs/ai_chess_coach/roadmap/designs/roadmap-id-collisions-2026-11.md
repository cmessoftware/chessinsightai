# Resolución de colisiones de IDs (nov 2026)

**Regla del tracker:** la numeración **FEAT-NNN / BUG-NNN** es **compartida** (un mismo número no puede designar dos ítems distintos).

## Colisión detectada

| Número | PR #274 (cerrado sin merge) | PR #275 (abierto) | Resolución canónica |
|--------|----------------------------|-------------------|---------------------|
| **121** | BUG-121 — ritmos Lichess | FEAT-121 — confirmación post-envío Comentarios | **FEAT-121** = Comentarios (#275). Ritmo Lichess → **BUG-128**. |
| **122** | FEAT-122 — historial de reportes (#271) | FEAT-122 — imágenes en issue GitHub | **FEAT-122** = Comentarios (#275). Historial → **FEAT-128** (parcialmente solapado con FEAT-123). |

## Referencias

- Issues usuario: [#270](https://github.com/cmessoftware/chessinsightai/issues/270) (ritmos), [#271](https://github.com/cmessoftware/chessinsightai/issues/271) (historial).
- PR cerrado: [#274](https://github.com/cmessoftware/chessinsightai/pull/274) (no integrar tal cual).
- Implementación Comentarios: [#275](https://github.com/cmessoftware/chessinsightai/pull/275).
- Hilo GitHub en UI: **FEAT-123** / **FEAT-124** (spec; no confundir con FEAT-128).