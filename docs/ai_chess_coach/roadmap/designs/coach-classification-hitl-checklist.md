# Checklist HITL · Clasificación e impacto pedagógico (CA-8)

**Estado:** Borrador operativo  
**Spec:** [Clasificación de jugadas e importancia pedagógica](../../Clasificación_de_%20jugadas_e_%20importancia%20pedagógica.md) §8  
**Mini-plan:** [coach-move-classification-pedagogy-mini-plan.md](./coach-move-classification-pedagogy-mini-plan.md) (CA-8, gate pre-DB)  
**Código cliente (umbrales v1):** `src/frontend/src/utils/coachPedagogicalImpact.js` → `ELO_POSITION_BANDS_V1`

---

## 1. Objetivo del HITL

Validar **antes de congelar contrato** (JSON → Python → DB):

| Capa | Qué validar | ¿HITL obligatorio? |
|------|-------------|-------------------|
| **§1 `engine_label`** | Umbrales 50 / 100 / 300 cp en `cp_loss` | Sí (límites 49/50, 299/300 + POV blancas/negras) |
| **§3 `pedagogical_impact`** | Buckets por Elo + transiciones antes/después | Sí (BUG-12, copy tooltip) |
| **§1 vs §3** | Un `??` con “ventaja decisiva conservada” no debe leerse como “perdiste la partida” | Sí |
| **`ml_label`** | Modelo de clasificación de errores (plataforma 09) | No sustituye este HITL; capa aparte |

**No es objetivo del HITL MVP:** entrenar ML ni cambiar `cp_loss` por Elo (spec §2: mismos umbrales de pérdida para todos los Elo).

---

## 2. Alcance mínimo (gate CA-8)

Como en spec §8 y roadmap P1-3:

- [ ] **≥ 3 partidas** completas revisadas (ideal **5**), mezcla de fases (apertura / medio / final).
- [ ] **≥ 20 plies** anotados en detalle (mínimo); ideal **40+** incluyendo casos BUG-12 (+8→+5, mates, time trouble no inferido).
- [ ] Bandas Elo cubiertas en la muestra: al menos una partida con Elo conocido en **1200–1599**, **1600–1999**, **2000+** (o anotar “sin Elo → banda default 1600–1999”).
- [ ] Revisores **≥ 2** (uno puede ser el implementador; el segundo preferible con nivel ≥ 1800 para finales).
- [ ] Registro de **versión** de umbrales (`ELO_POSITION_BANDS_V1` o `position_buckets.v1.json` cuando exista).
- [ ] Lista de **ajustes acordados** (cp por bucket) o “v1 aceptada sin cambio”.
- [ ] Firma / fecha en §7 de este doc.

---

## 3. Tabla de revisión por ply (plantilla)

Copiar bloques por partida. Exportar datos desde UI (futuro: `?debugClass=1`) o desde consola con `classificationByPathKey`.

| Partida ID | Ply | SAN | Elo quien mueve | `cp_loss` | `engine_label` | bestCp | playedCp | impacto UI | situación humana antes→después | ¿De acuerdo? | Notas |
|------------|-----|-----|-----------------|-----------|----------------|--------|----------|------------|--------------------------------|--------------|-------|
| | | | | | | | | | igual / ventaja / decisiva / ganada | Sí / No | |

**Columnas clave para BUG-12:**

- **¿De acuerdo?** = ¿el badge (`?!` `?` `??`) y el tooltip de impacto cuentan la misma historia que un entrenador?
- Si `engine_label` = blunder pero humano dice “solo imprecisión en posición ganada”, marcar **No** y clasificar causa:
  - **A** — §1 correcto, falta copy/impacto (arreglar CA-5 / tooltip).
  - **B** — §1 discutible (`cp_loss` inflado: depth, MultiPV, eval antes/después).
  - **C** — Umbrales de bucket Elo mal calibrados (ajustar `decisiveCp`, etc.).

---

## 4. Casos obligatorios en la muestra

Marcar en la tabla al menos **uno de cada tipo**:

- [ ] Pérdida ≥ 300 cp con **ventaja decisiva conservada** (ej. +8 → +5 en banda 1600).
- [ ] Pérdida grande **ganada → igualada** o **ventaja → peor**.
- [ ] Jugada negra y blanca con badge (POV normalizado).
- [ ] Posición con **mate** en motor → `pending` / sin forzar a cp.
- [ ] Ply con jugada **fuera de MultiPV** (`playedInMultipv: false`) si aparece en la muestra.
- [ ] Partida **sin** `WhiteElo`/`BlackElo` → banda default documentada.

---

## 5. Afinar la tabla estática v1 (manual)

Orden recomendado:

1. Fijar definiciones en prosa por bucket (§3 del spec).
2. Por banda Elo, ajustar solo en `ELO_POSITION_BANDS_V1`:
   - `decisiveCp`, `winningCp`, `clearAdvantageCp`, `equalBandCp`
3. Re-ejecutar las mismas partidas golden en el navegador.
4. Bump versión en comentario de código o JSON (`v1.1`).
5. Actualizar tests en `coachPedagogicalImpact.test.js` con 1–2 casos acordados.

**Coherencia entre bandas:** al subir Elo, `decisiveCp` no debería **aumentir** (2400 ≤ 2000 ≤ 1600 en centipeones).

---

## 6. ¿Se puede reemplazar la tabla estática con ML (miles de partidas, Elo 1200–2400+)?

**Sí, como fase posterior y con un rol claro:** ML calibra **umbrales de situación e impacto**, no sustituye la fórmula §1 ni mezcla con `ml_label` de error sin gobernanza.

### 6.1 Qué sí tiene sentido aprender con datos masivos

| Objetivo | Features típicas | Salida |
|----------|------------------|--------|
| **Buckets por Elo** (“¿+2.0 es decisivo en 2400?”) | `eval_cp` POV jugador, Elo, ritmo, fase, material, n plies al final | Curvas `P(ventaja sostenida \| eval, elo)` o umbrales por cuantil |
| **Impacto pedagógico** | `eval_before`, `eval_after`, `cp_loss`, Elo, fase | Clase §3 / §212 (o ranking de severidad pedagógica) |
| **Calibración de copy** | impacto + Elo + motivo verificado (F07) | Plantillas CA-6 (no umbrales cp) |

Fuentes de partidas: Lichess/Chess.com PGN con `WhiteElo`/`BlackElo`, imports propios, datasets internos. **Miles de partidas** ayudan a **estabilizar cuantiles por banda Elo**; **decenas de miles** reducen varianza en colas (2400+, bullet vs clásica).

Etiquetas de entrenamiento para impacto (elige una estrategia explícita):

1. **Proxy motor:** transición de buckets con eval Stockfish fija (depth 16+) — barato, sesgado igual que el cliente.
2. **Proxy resultado:** dado `eval_after` y Elo, tasa de victoria empírica en posiciones similares — alinea “decisivo” con **convertibilidad real**.
3. **Oro humano:** plies de `expert_gold` / HITL — pocos pero mandan para ajuste final.
4. **Híbrido (recomendado):** pre-entrenar con (1)+(2), **calibrar** con (3).

### 6.2 Qué no debe hacer el ML (spec y producto)

- **No** reemplazar `cp_loss` ni umbrales 50/100/300 por Elo (§2).
- **No** usar un solo modelo end-to-end que emita `??` sin separar `engine_label` vs `pedagogical_impact` (§6 pipeline).
- **No** publicar umbrales sin versión (`position_buckets.v2.json`) ni paridad tests JS ↔ Python (SV-1).

`ml_label` (§5, SV-5) es **otra cabeza**: predicción de tipo de error; puede **discrepar** del motor y debe registrarse aparte.

### 6.3 Pipeline sugerido (post-HITL v1 manual)

```text
PGN masivo (Elo 1200–2400+)
  → Stockfish batch (depth fijo, metadatos versionados)
  → Por ply: eval_before, eval_after, cp_loss, elo_band, fase
  → Agregar por (elo_band, eval_bin): win_rate / draw_rate
  → Ajustar decisiveCp donde P(win) ≥ τ (τ por banda, ej. 0.85 en 2400, 0.75 en 1400)
  → Validar en golden HITL + expert_gold
  → Export position_buckets.v2.json + tests golden JSON
  → Cliente + worker Python leen la misma versión
```

ML aquí puede ser **statistical / isotonic / GAM** sobre agregados; no hace falta deep learning para los umbrales. Redes entran más natural en **ml_label** o detección de motivos (§9).

### 6.4 Riesgos con miles de partidas

| Riesgo | Mitigación |
|--------|------------|
| Depth distinto entre batch y WASM cliente | Versionar `analysis_metadata`; HITL en profundidad “producto” |
| Eval cp ≠ probabilidad de victoria (finales, mates) | Tratar mate aparte; buckets solo en régimen cp |
| Mezclar ritmos | `rating_category` §10; umbrales opcionales por bullet/blitz |
| Sesgo de plataforma (solo Lichess) | Documentar provenance; recalibrar por `Site` |
| Sobreajuste a colas Elo | Mínimo N plies por bin; shrinkage hacia v1 manual |

### 6.5 Relación con este checklist

| Fase | Entrega |
|------|---------|
| **Ahora** | HITL manual sobre `ELO_POSITION_BANDS_V1` + golden table §3 |
| **Tras gate CA-8** | Mover umbrales a `public/config/position_buckets.v1.json` |
| **Phase 2 / SV-*** | Batch eval + agregados; proponer `v2` con ML/estadística |
| **SV-5** | `ml_label` opcional; nunca sobrescribe silenciosamente `engine_label` |

---

## 7. Registro de cierre HITL

| Campo | Valor |
|-------|--------|
| Versión umbrales | `ELO_POSITION_BANDS_V1` / `v1.___` |
| Fecha cierre | |
| Revisores | |
| Partidas (IDs o enlaces) | |
| Cambios aplicados | Ninguno / ver commit |
| ¿Gate CA-8 OK para SV-1? | Sí / No |

---

## 8. Referencias

- [issues-coach-move-classification-pedagogy-mini-plan.md](./issues-coach-move-classification-pedagogy-mini-plan.md) (BUG-12)
- [Clasificación … §8](../../Clasificación_de_%20jugadas_e_%20importancia%20pedagógica.md) — validación mínima
- Roadmap [00-roadmap-index.md](../00-roadmap-index.md) — HITL ×5, expert_gold
