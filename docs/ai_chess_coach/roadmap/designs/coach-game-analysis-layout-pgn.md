# Mini-plan · Coach análisis de partida (layout responsive + PGN paso a paso)

**Estado:** **Acordado** (depuración 2026-10-02) · **Phase web:** 1  
**Pantalla principal:** `/coach/games/:gameId/analysis`  
**Catálogo:** **UI-110** (layout + PGN + tablero único) — rama `feature/11_110_analysis_layout_pgn`

**Referencias:** [CONTRACT tablero](../../../ai_chess_coach_course/ui/chessinsight_board/CONTRACT.md) · [mount Chessground (Jupyter)](../../../ai_chess_coach_course/ui/chessinsight_board/mount.js) · Phase 1 [02-phase-01-coach-web-slice.md](../02-phase-01-coach-web-slice.md).

---

## Decisiones producto

| Tema | Decisión |
|------|----------|
| Candidatas verdes | **Todas** las líneas MultiPV (hasta 3, UCI únicos). |
| Plies no críticos | Tabs visibles; Motor: “Sin análisis en este ply”. |
| Panel MultiPV | Prefijo **●** verde en SAN candidatas (rank 1–3) en ply crítico. |
| Ply crítico | **`fen_before`** + candidatas “a jugar”; resto del PGN = posición **después** del ply. |
| Sync crítica ↔ PGN | Flechas / lista crítica / clic PGN → mismo `currentPly` + decisión. |
| **Mobile vs teclado** | Ver § **Navegación mobile y teclado** (abajo). |
| Layout A | Tablero + barra ply visibles sin scroll de página en ~1080p desktop. |
| **Tablero (global)** | **Una sola implementación:** Chessground en todo el frontend Vite. **No** mantener `react-chessboard` ni `SimpleChessBoard` en paralelo. |
| PGN / FEN | Chessground = render + highlights; **chess.js** = replay PGN e índice `ply` (alineado API). |

---

## Navegación mobile y teclado

Principio: **touch es la fuente de verdad**; el teclado es **mejora opcional** con el mismo comportamiento que desktop.

| Contexto | Comportamiento |
|----------|----------------|
| **Móvil / tablet solo touch** | Barra fija **⏮ ◀ ▶ ⏭** bajo el tablero (targets ≥ 44px), texto `ply k / N`. Sin depender de atajos. PGN y lista crítica siguen siendo tocables. |
| **Tablet / móvil + teclado externo** (Magic Keyboard, BT) | Mismos listeners que desktop: **← →** ply ±1, **Home / End** inicio/final, **solo si** el foco **no** está en `input`, `textarea` o `[contenteditable]`. |
| **Teclado virtual** (on-screen) | No usar ←/→ del OS; el usuario usa botones. No mostrar chip “← →” en pantallas `xs` (opcional en `sm+`). |
| **Home/End ausentes** en teclado compacto | ⏮ = Home, ⏭ = End (misma función). |
| **Accesibilidad** | Botones con `aria-label` (“Jugada anterior”, “Primera posición”, etc.). |

Implementación: hook `usePgnKeyboardNav({ enabled, onPrev, onNext, onFirst, onLast })` registrado en `CoachGameAnalysisPage`; `enabled = true` en todos los breakpoints (externo keyboard funciona en móvil); UI de botones **siempre** visible en mobile layout.

---

## Unificación Chessground (entrega F — obligatoria en UI-110)

**Objetivo:** al cerrar UI-110, **cero** rutas productivas con otro tablero.

| Paso | Acción |
|------|--------|
| F1 | Nuevo **`ChessinsightBoard.jsx`** (reemplazo): wrapper React Chessground, API = [CONTRACT](../../../ai_chess_coach_course/ui/chessinsight_board/CONTRACT.md) (`fen`, `orientation`, `lastMove`, `viewOnly`, `dests`, `onMove` + extensiones Coach: `highlight`, `shapes` / candidatas). Basado en `mount.js`. |
| F2 | **Coach** `/coach/games/:id/analysis` — primer consumidor (B2). |
| F3 | Migrar **`ChessBoard.jsx`** / **`ChessBoardPage`** (`/tablero`, partidas). |
| F4 | Migrar **`PlayStockfishPage`** (hoy `SimpleChessBoard`). |
| F5 | Migrar **`PersonalizedExercisesPage`** si usa tablero embebido. |
| F6 | Eliminar **`SimpleChessBoard.jsx`**, **`ChessBoardAlternative.jsx`**, dependencia **`react-chessboard`**; actualizar CONTRACT (React = Chessground únicamente). |
| F7 | Tests / smoke: Coach analysis + una ruta tablero legacy. |

**Orden en PR:** F1 → F2 (MVP análisis A–D) → F3–F5 → F6 en el **mismo epic UI-110** (puede ser 2 PRs si hace falta, pero **no mergear** F2 sin plan F3–F6 acordado en la misma rama o inmediatamente después).

Inventario actual a retirar:

- `ChessinsightBoard.jsx` (react-chessboard)
- `SimpleChessBoard.jsx`
- `ChessBoardAlternative.jsx`

---

## 1. Problema

- Layout Coach no coincide con bosquejo.
- Sin PGN navegable coherente en mobile/desktop.
- Tres stacks de tablero en frontend (deuda + inconsistencia visual).
- API sin PGN por partida.

---

## 2. Objetivo (producto)

1. Layout responsive (§3).
2. Navegación ply (botones + teclado cuando aplique) — § mobile.
3. Candidatas verdes tablero + PGN + ● en panel.
4. **Un tablero:** Chessground everywhere (§ F).

---

## 3. Wireframe

```text
Desktop / tablet (md+)
┌─────────────────────────────────────────────────────────────┐
│ Título · POV                                    [Cola]      │
├──────────────────────────┬──────────────────────────────────┤
│      TABLERO (CG)        │  Jugadas críticas                │
│  [⏮ ◀ ▶ ⏭]  ply k/N      │  Motor | Mental | MultiPV        │
│                          │  PGN (clic)                      │
└──────────────────────────┴──────────────────────────────────┘

Mobile (touch)
┌──────────────────────────┐
│ TABLERO (CG)             │
│ [⏮] [◀]  k/N [▶] [⏭]    │  ← siempre visible
│ Críticas → Motor → PGN   │
└──────────────────────────┘
```

---

## 4. Entregas

| Entrega | Contenido | MVP |
|--------|-----------|-----|
| **A** | Layout responsive | Sí |
| **B** | API `GET /games/{id}` + replay chess.js | Sí |
| **B2 / F1** | `ChessinsightBoard` Chessground + CONTRACT | Sí |
| **C** | Navegación ply (botones + hook teclado § mobile) | Sí |
| **D** | Candidatas verdes + ● panel | Sí |
| **F2–F6** | Migración resto app + borrar react-chessboard | **Sí (cierre UI-110)** |
| **E** | Flechas SVG extra, scroll PGN auto, a11y fino | Post-MVP |

MVP UI-110 = **A + B + B2 + C + D + F (completo)**.

---

## 5. Reglas de resaltado

(Sin cambios — ver versión anterior: amarillo last move, verde candidatas, azul jugada en partida en panel, verde SAN en PGN crítico.)

| Elemento | Estilo | Cuándo |
|----------|--------|--------|
| Última jugada | Amarillo | Replay, `currentPly > 0` |
| Modo crítico | `fen_before` | `currentPly === decision.ply` |
| Candidatas | Verde casillas | Ply crítico + pack |
| PGN | Fondo verde SAN | Ply crítico |
| Motor | ● verde | Candidatas rank 1–3 |

---

## 6. Estado y flujos

(Iguales a versión acordada: `boardMode` replay | decision; Chessground recibe fen, highlights, shapes; flechas finas en entrega E.)

---

## 7. Cambios técnicos

| Área | Cambio |
|------|--------|
| API | `GET /games/{id}` + `pgn` |
| UI Coach | `CoachGameAnalysisPage`, sidebar, `CoachPgnNavigator` |
| UI global | Un `ChessinsightBoard` Chessground |
| deps | + `chessground`; − `react-chessboard` al terminar F6 |
| Tests | RTL ply nav; pytest game endpoint; smoke tablero |

---

## 8. Criterios de aceptación

- [ ] Layout desktop/mobile según §3.
- [ ] Mobile: barra ⏮◀▶⏭ usable sin teclado; con teclado externo ←→ Home/End funcionan.
- [ ] Ply crítico: verde + ● + `fen_before`.
- [ ] **Ningún import** de `react-chessboard` / `SimpleChessBoard` en `src/frontend`.
- [ ] Jupyter `mount.js` sigue alineado al CONTRACT actualizado.
- [ ] `npm run build` verde.

---

## 9. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Regresión tablero / jugar vs Stockfish | F3–F4 con prueba manual + test mínimo movimientos legales |
| Chessground + drag en PlayStockfish | `dests` + `onMove` en CONTRACT; port lógica desde SimpleChessBoard |
| Alcance UI-110 grande | F en 2 PR secuenciales misma epic; no dejar F6 para “después” sin issue |

---

## 10. Fuera de alcance

Edición PGN, Stockfish live por ply, `/review` separada.

---

## 11. Próximos pasos

1. Issue **UI-110** con enlaces a este doc.  
2. Implementar F1 + Coach (A–D) → migrar F3–F5 → F6.  
3. Entrega **E** follow-up.

---

## Changelog doc

| Fecha | Nota |
|-------|------|
| 2026-10-02 | Borrador → Acordado |
| 2026-10-02 | § Mobile/teclado; entrega **F** tablero único Chessground (obligatoria) |
