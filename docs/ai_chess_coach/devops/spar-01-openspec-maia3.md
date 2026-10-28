# SPAR-01 · OpenSpec Maia-3 (CI-SPAR-01 §4.6)

**Estado:** Cerrado (OpenSpec)  
**Actualizado:** 2026-10-28  
**Runbook operativo:** [spar-01-maia-local-windows.md](./spar-01-maia-local-windows.md)  
**Evidencia smoke:** [maia_mocktest.md](../roadmap/deep_analysis/sources/maia_mocktest.md)  
**Código:** `src/modules/sparring/maia_settings.py` (`load_maia_settings`, `build_uci_argv`)

---

## 1. Decisión de producto

| Tema | Decisión |
|------|----------|
| Motor principal | **Maia-3** UCI ([CSSLab/maia3](https://github.com/CSSLab/maia3)), preset dev **`maia3-5m`** |
| Fallback | **Lc0 + pesos Maia-2** solo si `MAIA_PROVIDER=lc0_maia2` (air-gap / CI sin HF) |
| Pesos | Cache Hugging Face en disco del host (`maia3-cache`); **nunca** descargar por turno de sparring |
| GPU | Opcional (`MAIA3_DEVICE=cuda`); MVP local Windows validado en **CPU** |
| Stockfish | **No** en vivo durante sparring; solo post-partida (SPAR-09) |

---

## 2. Licencias y atribución

| Artefacto | Fuente | Uso en ChessInsight |
|-----------|--------|---------------------|
| Código **maia3** | Repo [CSSLab/maia3](https://github.com/CSSLab/maia3) — revisar `LICENSE` del tag instalado | Dependencia Python en entorno servidor/worker |
| Pesos **Maia3-5M/23M/79M** | [Hugging Face · UofTCSSLab/Maia3-*](https://huggingface.co/collections/MaiaChess/maia3) | Inferencia local; cache bajo `~/.cache/huggingface/` |
| Paper | Chessformer / Maia (CSSLab) | Citar en docs producto o changelog si se publican resultados de evaluación |
| **Lc0** + Maia-2 `.pb.gz` | Lc0 upstream + pesos Maia Chess | Solo fallback; licencias propias de cada binario/peso |

**Operación:** documentar versión instalada (`pip show maia3`, snapshot HF) en despliegues prod (SPAR-12).

---

## 3. Contrato de variables de entorno

Plantillas: [`src/.env_sample`](../../../src/.env_sample), [`src/api/.env.example`](../../../src/api/.env.example).

| Variable | Obligatoria | Default | Descripción |
|----------|-------------|---------|-------------|
| `MAIA_PROVIDER` | No | `maia3` | `maia3` \| `lc0_maia2` |
| `MAIA3_CMD` | Sí* | `maia3-5m` | Ejecutable en PATH |
| `MAIA3_PYTHON` | No | — | Alternativa: intérprete |
| `MAIA3_MODULE` | No | — | Con Python: `maia3.uci` |
| `MAIA3_MODEL` | No | — | Sufijo `5m`/`23m`/`79m` si usás módulo |
| `MAIA3_DEFAULT_ELO` | No | `1500` | UCI `Elo` / `configure` |
| `MAIA3_DEVICE` | No | `cpu` | `cpu` \| `cuda` |
| `MAIA3_USE_UCI_HISTORY` | No | `1` | `--use-uci-history` |
| `MAIA3_EXTRA_ARGS` | No | — | p. ej. `--no-use-amp` (Windows CPU) |
| `MAIA_MOVE_TIMEOUT_SEC` | No | `60` | Primera carga HF; SPAR-06 |
| `MAIA_ENGINE_PATH` | Fallback | — | Lc0 exe |
| `MAIA_WEIGHTS_DIR` | Fallback | — | Directorio `.pb.gz` Maia-2 |

\*O bien `MAIA3_PYTHON` + `MAIA3_MODULE`.

---

## 4. Checkpoints y cache (no por turno)

1. **Precarga:** `maia3-cache --model maia3-5m` en deploy o imagen Docker.
2. **Runtime:** el worker SPAR-06 mantiene **un proceso UCI** por pool/sesión (diseño SPAR-03); no invocar `pip` ni HF en el hot path.
3. **Cache key** de predicción (SPAR-03): FEN + historial UCI completo + Elo efectivo + versión modelo.

---

## 5. Presets de nivel (entrada SPAR-03)

| Preset UI (provisional) | Ajuste Elo interno | Notas |
|-------------------------|-------------------|--------|
| Consolidación | −100 vs objetivo alumno | Bot más débil |
| Equilibrado | 0 | Default |
| Desafío | +100 … +200 | Bot más fuerte |

Guardar en `model_config_snapshot`: Elo solicitado, Elo aplicado (`SelfElo`/`OppoElo`/`Elo`), alias modelo, versión paquete.

---

## 6. Criterios de cierre SPAR-01

- [x] Decisión Maia-3 documentada (runbook + este OpenSpec).
- [x] Smoke Maia-3 OK — [maia_mocktest.md](../roadmap/deep_analysis/sources/maia_mocktest.md).
- [x] Variables `MAIA_*` en plantillas `.env`.
- [x] Loader Python `load_maia_settings()` + tests.
- [x] Licencias/atribución y política de cache documentadas.
- [ ] SPAR-03: adaptador UCI en worker (siguiente ítem).
