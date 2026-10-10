# Checklist HITL · Modelo mental 1600 (FEAT-07 / M-11)

**Estado:** Borrador operativo  
**Spec humana:** diagramas HTML en [`07_cc_detection_algoritms/`](../../../ai_chess_coach_course/07_cc_detection_algoritms/) · informe [`07_cc_human_mental_model_analysis.md`](../../../ai_chess_coach_course/07_cc_human_mental_model_analysis.md)  
**Mini-plan:** [coach-mental-1600-mini-plan.md](./coach-mental-1600-mini-plan.md) (M-11, gate pre-congelar reglas JS / Phase 2 worker)  
**Código cliente:** `src/frontend/src/utils/coachMental1600.js` → `MENTAL_MODEL_RULES_VERSION = 'v1'`  
**UI:** pestaña **Mental 1600** · `Mental1600Panel.jsx` · hook `useMental1600Assessment.js`

**Relación con CA-8:** [coach-classification-hitl-checklist.md](./coach-classification-hitl-checklist.md) valida **§1 / §3** (badges y impacto). Este HITL valida **cómo pensar** (modo fast/critical, E1–E11, notable, S1–S4, plan G/H/S). Pueden ejecutarse en la **misma sesión** de revisión por ply.

---

## 1. Objetivo del HITL

Validar **antes de congelar** `coachMental1600.js` (y portar a Python/worker):

| Capa | Qué validar | ¿HITL obligatorio? |
|------|-------------|-------------------|
| **Modo fast / critical** | ¿Pausa y plan C/C1 vs F→S coinciden con lo que enseñarías a ~1600 rapid? | Sí |
| **Disparadores E1–E11** | ¿Aparecen cuando el HTML lo marcaría? ¿Falsos positivos (E2 “hay capturas legales”)? | Sí |
| **Notable** | Retomar centro, cambio de peones, jaque — no “todo el medio juego crítico” | Sí |
| **Anti-blunder S1–S4** | ¿La jugada **hecha** dispara S* cuando un coach diría “cuidado”? | Sí (muestra acotada) |
| **D1–D5 + MultiPV** | ¿Orden forzante → posicional es pedagógico vs motor? | Recomendado |
| **Pausa (s)** | 5 / 10 / 30 según ritmo + banda Elo | Recomendado |
| **Paridad Python** | Mismos FEN golden que `test_mental_model_1600.py` | Automatizado (M-10); HITL solo discrepancias |

**No es objetivo:** reemplazar Stockfish; entrenar ML; árbol HTML interactivo (U-10).

---

## 2. Alcance mínimo (gate M-11)

Inspirado en spec §8 del curso y lab `07_0_mental_model_lab.ipynb`:

- [ ] **≥ 3 partidas** rapid propias o de la biblioteca Coach (ideal **5**), POV jugador analizado claro.
- [ ] **≥ 15 plies tuyos** revisados en pestaña Mental 1600 (ideal **25+**), incluyendo al menos **3** con modo **critical** y **3** con modo **fast** aceptables.
- [ ] Al menos **1** posición tipo **retomar en el centro** (ej. …d4 exd4) → notable + critical.
- [ ] Al menos **1** apertura “tranquila” (ej. …d6 tras d4) → **fast**, sin E2 espurio.
- [ ] Al menos **1** ply con **error grave** (`??`) donde anti-blunder o triggers cuenten la historia.
- [ ] Ritmo documentado: **rapid** por defecto o `TimeControl` del PGN anotado.
- [ ] Elo en headers cuando exista; si no, anotar “default 1600 → pausa 10 s”.
- [ ] Revisores **≥ 1** humano con nivel objetivo ~1600–2000 (segundo revisor opcional ≥ 1800).
- [ ] Versión de reglas anotada: **`MENTAL_MODEL_RULES_VERSION`** en código.
- [ ] Lista de **ajustes acordados** (constantes / copy) o “v1 aceptada sin cambio”.
- [ ] Firma / fecha en §7 de este doc.

---

## 3. Tabla de revisión por ply (plantilla)

Copiar bloques por partida. Datos desde UI (pestaña Mental 1600) y, si ayuda, consola React (`mental1600View` / assessment en devtools).

| Partida ID | Ply | SAN (tuya) | `mode` UI | `pause_s` | Triggers (E*) | Notable (kind) | S* fallidos | D1–D5 (top 3) | ¿De acuerdo? | Notas |
|------------|-----|------------|-----------|-----------|---------------|----------------|-------------|---------------|--------------|-------|
| | | | fast / critical | | E2, E11… | recapture_choice… | S1… | D1·e2e4… | Sí / No | |

**¿De acuerdo?** = ¿un coach 1600 enseñaría **este** plan y **esta** pausa en este momento?

Si **No**, clasificar causa:

- **A** — Modo fast/critical mal (notable o Δeval): revisar `detectNotableCritical`, `FAST_PATH_EVAL_DELTA` (40 cp).
- **B** — Trigger E* faltante o espurio: revisar `detectTriggers` (E2 vs “capturas legales”, E6/E9 peones, etc.).
- **C** — Anti-blunder S* incorrecto sobre jugada hecha: revisar `runAntiBlunderChecks`.
- **D** — Copy del plan (G/H/S o C/C1) — texto, no reglas.
- **E** — D1–D5 / orden MultiPV — heurística `classifyCandidateMove` / `orderTopMovesByCategory`.
- **F** — Falta contexto (sin `grandparentFen` / rival move): bug integración hook.

---

## 4. Casos obligatorios en la muestra

Marcar al menos **uno** de cada fila (anotar SAN + enlace partida si aplica):

- [ ] **Posición inicial** → mensaje “avanzá en el PGN” (no panel vacío).
- [ ] **Jugada del rival** → mensaje “elegí una jugada tuya”.
- [ ] **Fast tras apertura quieta** (sin notable; triggers E2 no por “hay capturas”).
- [ ] **Critical por notable** (retomar / centro / estructura de peones).
- [ ] **Critical por Δeval** (salto ≥ ~80 cp en trigger E11 o ≥ 40 cp en modo).
- [ ] **Scholar / amenaza E2** con modo **fast** si no hay notable (cf. pytest `test_scholar_mate_threat`).
- [ ] **Jugada con material colgando rival** → E1 con evidencia legible.
- [ ] **Jugada tuya con S*** → chips warning; jugada “sana” → mensaje verde S1–S4 OK (si aplica).
- [ ] **MultiPV**: ≥ 2 candidatas D* visibles tras re-análisis (o partida nueva sin cache viejo).
- [ ] Comparar **1** ply con notebook/lab Python (`assess_decision_point`) si discrepa fuerte → registrar FEN.

---

## 5. Afinar reglas v1 (manual)

Orden recomendado:

1. Cerrar **modo fast/critical** (notable + Δeval) con 2–3 FEN acordados; actualizar tests en `coachMental1600.test.js`.
2. Ajustar **E2 / E6 / E9** según partidas reales (evitar medio juego “todo critical”).
3. Revisar **S3** (captura obvia de pieza mayor) — falsos positivos en tácticas forzadas aceptables.
4. Bump `MENTAL_MODEL_RULES_VERSION` → `v1.1` en comentario + entrada §7.
5. Si se cambia comportamiento, re-ejecutar `npm test` y anotar commit.

**Coherencia con Python:** tras cambios JS, ejecutar `pytest tests/docs_courses/test_mental_model_1600.py` y documentar divergencias aceptadas (cliente puede ir delante del lab).

---

## 6. Criterio de cierre (gate M-11)

**Gate OK** cuando:

- Alcance §2 completado (checkboxes marcados).
- Tabla §3 con **≥ 15 filas** y **≥ 80%** “De acuerdo = Sí”, o issues A–F con tickets/commits para el resto.
- Casos obligatorios §4 cubiertos.
- §7 firmado con versión y decisión: **congelar v1** / **iterar v1.1** / **bloquear Phase 2 worker**.

Hasta entonces: FEAT-07 MVP cliente usable; **no** marcar paridad Python↔JS obligatoria en producción.

---

## 7. Registro de cierre HITL

| Campo | Valor |
|-------|--------|
| Versión reglas | `MENTAL_MODEL_RULES_VERSION` / `v1.___` |
| Fecha cierre | |
| Revisores | |
| Partidas (IDs Coach / PGN) | |
| Plies revisados (N) | |
| Cambios aplicados | Ninguno / ver commit |
| ¿Gate M-11 OK para worker (S04+)? | Sí / No |
| Notas CA-8 (clasificación) | En paralelo / cerrado / N/A |

---

## 8. Referencias

- [coach-mental-1600-mini-plan.md](./coach-mental-1600-mini-plan.md) — entregas M-1…M-11
- [coach-classification-hitl-checklist.md](./coach-classification-hitl-checklist.md) — CA-8 / BUG-12
- [issues-coach-move-classification-pedagogy-mini-plan.md](./issues-coach-move-classification-pedagogy-mini-plan.md) — FEAT-07
- Lab: [`07_0_mental_model_lab.ipynb`](../../../ai_chess_coach_course/07_0_mental_model_lab.ipynb)
- HTML canónico: [`algoritmo_posiciones_criticas_ajedrez.html`](../../../ai_chess_coach_course/07_cc_detection_algoritms/algoritmo_posiciones_criticas_ajedrez.html)
