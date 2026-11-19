# FEAT-119 · Mover piezas por casilla origen y destino (móvil)

**Estado:** ⬜ Todo (solo documentación)  
**Tracker:** [issues-coach-move-classification-pedagogy-mini-plan.md](./issues-coach-move-classification-pedagogy-mini-plan.md) (fila FEAT-119)  
**Rama sugerida:** `feature/11_119_tap_to_move`  
**Relacionado:** FEAT-083 (Nueva partida), FEAT-062 (coronación), `ChessinsightBoard`, `CoachStudyWorkspace`, editor FEN (FEAT-039)

## Problema

En **móvil y tablet táctil**, el tablero de análisis y los flujos que permiten introducir jugadas (**Nueva partida**, variantes en estudio, **Cargar Posición** cuando el tablero es jugable) dependen de **arrastrar y soltar** (`react-chessboard` + `@dnd-kit`).

El drag en pantallas pequeñas es poco fiable: piezas que no enganchan, scroll accidental, targets estrechos. En escritorio el drag sigue siendo válido; en touch hace falta un segundo canal de entrada.

## Objetivo

Habilitar **mover piezas eligiendo casilla de origen y casilla de destino** (tap / clic), con el **mismo resultado** que un drop legal: una jugada en el árbol PGN, misma validación y mismo flujo de **promoción** (`CoachPromotionPicker`).

## Alcance

| Incluye | Excluye (por ahora) |
|--------|---------------------|
| Tablero interactivo en análisis, estudio y «Nueva partida» vía `ChessinsightBoard` / `CoachStudyWorkspace` | Sparring (SPAR-08) hasta reutilizar el mismo contrato |
| Resaltado visual de origen y destinos legales (si hay `dests` / chess.js) | Modo solo lectura (`viewOnly`) |
| Convivencia con drag & drop en el mismo tablero | Sustituir drag en desktop |
| Cancelar selección (segundo tap en origen, tap en otra pieza del bando al mover) | Premoves, flechas, círculos FEAT-075 (no deben romperse) |

## Comportamiento (aceptación)

1. Con el tablero en modo jugable, **tocar o clicar una pieza del bando al mover** marca la **casilla de origen** (estilo visible, p. ej. fondo resaltado).
2. **Tocar o clicar un destino legal** ejecuta la jugada por el mismo callback que `onPieceDrop` / `onMove` (incluida coronación si aplica).
3. **Destino ilegal o vacío** (sin pieza propia que reemplace el flujo de captura): no cambia la posición; puede limpiar o mantener origen según UX acordada en implementación (mínimo: no aplicar jugada).
4. **Segundo tap en la misma casilla origen** cancela la selección.
5. **Tap en otra pieza del mismo color con turno** cambia el origen a esa pieza.
6. **Drag & drop** sigue funcionando como hoy en los mismos pantallas.
7. Verificar en **móvil real o emulación touch** y en **escritorio**: «Nueva partida», introducir variante en análisis, tablero jugable en Cargar Posición / estudio.

## Implementación (orientación)

- Extender `ChessinsightBoard.jsx`: estado `selectedSquare`, `onSquareClick` de `react-chessboard`, merge con `squareStyles` (origen + destinos legales).
- Reutilizar la función que hoy valida/aplica el movimiento desde `CoachStudyWorkspace` (no duplicar lógica chess.js).
- Detección: habilitar tap-to-move siempre que `allowDragging` y no `viewOnly` (no limitar solo a coarse pointer; el clic en desktop también beneficia usuarios sin drag).
- Cuidar conflicto con **círculos** FEAT-075: clic izquierdo en casilla marcada quita círculo — definir prioridad (p. ej. si hay origen seleccionado, destino primero; si no hay origen, comportamiento actual de círculos).
- Actualizar [CONTRACT](../../../ai_chess_coach_course/ui/chessinsight_board/CONTRACT.md) con props opcionales cuando exista código.

## Referencias

- PR documentación previa: [#263](https://github.com/cmessoftware/chessinsightai/pull/263) (`docs/feat-119-seleccion-casillas`).
- react-chessboard: ejemplo [ClickToMove](https://react-chessboard.vercel.app/) (v5 `onSquareClick` / `onPieceClick`).