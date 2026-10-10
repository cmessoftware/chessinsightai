# Mini-plan · Análisis desde posición (FEN / tablero / imagen)

**Estado:** 🧪 POS-1 en repo (`/coach/position`)  
**Precondición AS:** completar **POS-1** (FEN texto) antes de **AS-2…AS-4** (partidas server-first), para reutilizar el mismo flujo de “posición suelta” en **AS-9**.  
**Arquitectura:** [arquitectura_candidata_servicios_analisis.md](../../arquitectura_candidata_servicios_analisis.md)  
**Cola async:** [coach-async-analysis-server-mini-plan.md](./coach-async-analysis-server-mini-plan.md)

**Objetivo:** analizar **posiciones que no vienen de un PGN importado** — estudio, ejercicios, capturas — con el mismo tablero Coach y motor (WASM en MVP; servidor en AS-B).

---

## Fuentes de posición (roadmap)

| Id | Fuente | MVP | Fase | Rama sugerida |
|----|--------|-----|------|----------------|
| **POS-1** | **FEN en texto** (pegar / escribir) | **Sí — único alcance MVP** | Phase 1–2 (antes de AS-A) | `feature/11_122_position_fen_entry` |
| **POS-2** | **Imagen del tablero** → FEN | No | Phase 2+ / investigación | `feature/11_12x_position_image_fen` |
| **POS-3** | **Editor en tablero** (armar posición drag & drop) | No | Phase 2+ (tras UI-110 Chessground) | `feature/11_12x_position_board_editor` |

---

## POS-1 — MVP FEN texto (detalle)

### Alcance

- Nueva ruta o modo: **`/coach/position`** (o pestaña “Posición” junto a import).
- Campo multilínea **FEN** + validación (`chess.js` / python-chess reglas).
- Botones: **Cargar**, **Posición inicial**, **Limpiar**.
- Selector **orientación** (blancas / negras abajo) y **POV coach** (blancas/negras) para eval en Motor live.
- **Tablero** (`ChessinsightBoard` / Chessground) + **Motor live** (WASM) — mismo patrón que análisis de partida tab 0.
- **Sin** PGN, **sin** CA-2 background, **sin** job module07 en v1 (no hay `game_id`).
- Opcional v1.1: guardar posición en **sessionStorage** al navegar.

### Fuera de POS-1

- Clasificación ply / Análisis avanzado CA-4 (requiere árbol de jugadas).
- Persistencia Postgres.
- Análisis server (llega con **AS-9** reutilizando FEN normalizado).
- Imagen y editor (POS-2, POS-3).

### Criterios de aceptación

- [ ] FEN válido muestra tablero y eval live en &lt; 3 s (WASM).
- [ ] FEN inválido: mensaje claro, tablero no crashea.
- [ ] FEN solo 4 campos vs 6: aceptar y completar halfmove/fullmove por defecto si hace falta.
- [ ] Accesible desde nav Coach (enlace visible).

### Piezas previstas

| Capa | Archivos / notas |
|------|------------------|
| UI | `CoachPositionPage.jsx`, MUI TextField FEN, reutilizar `LiveEnginePanel` + tablero |
| Utils | `parseFenInput.js` (trim, validación, defaults) |
| Router | `App.jsx` ruta `/coach/position` |
| Tests | Vitest `parseFenInput.test.js` |

---

## POS-2 — Imagen → FEN (planificado, no MVP)

### Intención

- Upload PNG/JPG/WebP del tablero (Lichess screenshot, foto, diagrama).
- Pipeline candidato: detector de grid + clasificador piezas (modelo CV) **o** integración API externa (TOS/licencia en OpenSpec).
- Salida: FEN propuesto + **revisión humana obligatoria** (editor POS-3 o ajuste manual) antes de analizar.

### Entregas futuras

| Id | Entrega |
|----|---------|
| POS-2a | Spike: evaluar 1–2 libs/servicios; matriz precisión/latencia/licencia |
| POS-2b | UI upload + preview FEN editable |
| POS-2c | Tests con imágenes golden (fixtures en repo, LFS si aplica) |

**Riesgo:** precisión OCR/CV; no bloquear AS-A.

---

## POS-3 — Editor tablero (planificado, no MVP)

### Intención

- Modo “armar posición”: drag & drop piezas, borrar, flip board, enroque / en passant en UI.
- Export → FEN texto → mismo flujo que POS-1.
- Depende de **UI-110** / Chessground con modo edición (`viewOnly: false`, piezas en spare box).

### Entregas futuras

| Id | Entrega |
|----|---------|
| POS-3a | Modo edición en tablero standalone |
| POS-3b | Reglas: rey/oponente, no peones en fila 1/8, etc. |
| POS-3c | “Analizar esta posición” → POS-1 con FEN generado |

---

## Orden respecto a AS (async servidor)

```text
POS-1 (FEN texto + WASM live)     ← primero
    ↓
AS-A (partidas full line server)
    ↓
AS-9 (POST analyze FEN server)    ← reutiliza normalización FEN de POS-1
    ↓
POS-2 / POS-3 (imagen / editor)
```

| Pregunta | Respuesta |
|----------|-----------|
| ¿POS-1 bloquea AS-1 SV-2? | No (partidas PGN siguen paralelo). |
| ¿POS-1 bloquea AS-2? | **Recomendado antes:** contrato FEN y UX tablero sueltos estables. |
| ¿POS-1 usa module07? | No en MVP; opcional luego `module07_positions` si hace falta historial. |

---

## Referencias

- [02-phase-01-coach-web-slice.md](../02-phase-01-coach-web-slice.md) — slice UI
- [coach-game-analysis-layout-pgn.md](./coach-game-analysis-layout-pgn.md) — tablero Chessground
- [issues-coach-move-classification-pedagogy-mini-plan.md](./issues-coach-move-classification-pedagogy-mini-plan.md) — fila FEAT opcional

**Última revisión:** 2026-10-09
