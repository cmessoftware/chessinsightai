# SPAR-01 · Maia servidor en Windows (OpenSpec local)

**Estado:** ✅ SPAR-01 cerrado (OpenSpec)  
**Actualizado:** 2026-10-28  
**OpenSpec:** [spar-01-openspec-maia3.md](./spar-01-openspec-maia3.md)
**Decisión producto:** **Maia-3** UCI nativo ([CSSLab/maia3](https://github.com/CSSLab/maia3)) — no Lc0 + pesos Maia-2 en el camino principal.  
**Tracker:** [issues-sparring-maia-server-mini-plan.md](../roadmap/deep_analysis/issues-sparring-maia-server-mini-plan.md) · Evidencia smoke: [maia_mocktest.md](../roadmap/deep_analysis/sources/maia_mocktest.md)

Spec [CI-SPAR-01 §4.6](../../spec_sparring_maia_stockfish_unificado.md) · Arquitectura [HumanMoveModel](../roadmap/deep_analysis/architecture-sparring-maia-module.md).

---

## 1. Prerrequisitos (stack Coach)

| Requisito | Notas |
|-----------|--------|
| **Python 3.10+** (mismo venv que Coach MVP recomendado) | Maia-3 se instala con `pip` |
| Postgres + API Coach | Sparring código viene en SPAR-02+ |
| `STOCKFISH_PATH` | Solo análisis **post-partida** (SPAR-09) |

**No** hace falta Lc0 ni `.pb.gz` Maia-2 si usás Maia-3. Ver [§8 fallback Lc0](#8-fallback-lc0--maia-2-opcional).

---

## 2. Instalar Maia-3 (Windows)

En un venv (o el mismo entorno del backend):

```powershell
git clone https://github.com/CSSLab/maia3.git C:\src\maia3
cd C:\src\maia3
python -m pip install .
```

Comprobar entrypoints:

```powershell
where.exe maia3-5m
maia3-uci --list-models
```

**Primera ejecución:** descarga el checkpoint desde Hugging Face y lo cachea. Precargar (recomendado, evita timeout en GUI/worker):

```powershell
maia3-cache --model maia3-5m
```

| Modelo | Uso | Comando |
|--------|-----|---------|
| **5M** | Dev local, CPU, primer smoke | `maia3-5m` |
| 23M | Mejor precisión | `maia3-23m` |
| 79M | Máxima precisión (GPU/RAM) | `maia3-79m` |

Documentación upstream: [README maia3](https://github.com/CSSLab/maia3/blob/main/README.md) · [modelos HF](https://huggingface.co/collections/MaiaChess/maia3).

**Licencia / atribución:** citar paper Chessformer en doc producto si publicás resultados; revisar licencia del repo y pesos HF en SPAR-01 PR.

---

## 3. Smoke test UCI (Maia-3)

### 3.1 Interactivo

```powershell
$engine = "maia3-5m"   # o ruta completa desde where.exe
& $engine
```

```text
uci
isready
setoption name Elo value 1500
position startpos
go nodes 1
quit
```

Criterio SPAR-01: `uciok`, `readyok` (puede cargar modelo en `isready`), **`bestmove`** legal.

Maia-3 puede emitir líneas `info` con MultiPV/WDL; el sparring MVP solo necesita `bestmove` (spec: no mezclar eval Maia con Stockfish en UI de juego).

### 3.2 PowerShell (stdin)

```powershell
@(
  "uci",
  "isready",
  "setoption name Elo value 1500",
  "position startpos",
  "go nodes 1",
  "quit"
) | & maia3-5m
```

### 3.3 Python (contrato SPAR-03)

```python
import chess
import chess.engine

eng = chess.engine.SimpleEngine.popen_uci([
    "maia3-5m",
])
eng.configure({"Elo": 1500})
board = chess.Board()
move = eng.play(board, chess.engine.Limit(nodes=1)).move
print(move)
eng.quit()
```

Si `maia3-5m` no está en PATH:

```python
import sys
cmd = [sys.executable, "-m", "maia3.uci", "--model", "maia3-5m", "--device", "cpu", "--no-use-amp"]
```

Opciones útiles para sparring (SPAR-03):

- `--use-uci-history` — historial desde movimientos UCI (repeticiones; spec `history_complete`).
- UCI `SelfElo` / `OppoElo` o `Elo` — nivel humano (~1100–1900+ según modelo).
- `Temperature` / `TopP` — muestreo; `0` = argmax.

---

## 4. Variables de entorno (Maia-3)

Añadir al **`.env` raíz** (plantilla en [`src/.env_sample`](../../../src/.env_sample)).

| Variable | Obligatoria | Ejemplo | Uso |
|----------|-------------|---------|-----|
| `MAIA_PROVIDER` | Sí | `maia3` | `maia3` \| `lc0_maia2` (legacy) |
| `MAIA3_CMD` | Sí* | `maia3-5m` | Ejecutable preset en PATH |
| `MAIA3_MODEL` | No | `5m` | Si usás `python -m maia3.uci` en lugar de preset |
| `MAIA3_DEFAULT_ELO` | No | `1500` | `setoption name Elo` / configure |
| `MAIA3_DEVICE` | No | `cpu` | `cpu` o `cuda` |
| `MAIA3_USE_UCI_HISTORY` | No | `1` | Pasar `--use-uci-history` al lanzar |
| `MAIA3_EXTRA_ARGS` | No | `--no-use-amp` | CPU Windows |
| `MAIA_MOVE_TIMEOUT_SEC` | No | `60` | Primera carga HF puede tardar; SPAR-06 |

\* Alternativa: `MAIA3_PYTHON=python` + `MAIA3_MODULE=maia3.uci` + args en `MAIA3_EXTRA_ARGS`.

**Deprecado para camino principal:** `MAIA_ENGINE_PATH` + `MAIA_WEIGHTS_DIR` (solo §8 Lc0).

---

## 5. Mapeo nivel sparring → Maia-3

- UI: Elo solicitado (declarado) ≠ Elo plataforma (spec §2.2).
- Motor: opciones UCI **`Elo`**, **`SelfElo`**, **`OppoElo`** según bando del bot/alumno.
- Guardar en `model_config_snapshot`: Elo pedido, Elo efectivo aplicado, alias modelo (`5m`/`23m`/`79m`), versión paquete `maia3`.

No usar `go nodes 1` como único knob de “fuerza”; la fuerza es **Elo** + muestreo. SPAR-03 puede usar `Limit(nodes=1)` o tiempo corto según pruebas HITL.

---

## 6. CPU vs GPU (Maia-3)

```powershell
maia3-uci --model maia3-5m --device cpu --no-use-amp
```

| Modelo | Dev Windows CPU | Prod |
|--------|-----------------|------|
| 5M | Recomendado smoke + sparring MVP | OK CPU |
| 23M / 79M | Probar RAM/latencia | GPU si SPAR-12 lo justifica |

---

## 7. Checklist SPAR-01 (Maia-3)

- [x] `pip install .` en maia3 OK; `where maia3-5m` OK.
- [x] `maia3-cache --model maia3-5m` OK (HF accesible).
- [x] Smoke §3: `bestmove` en startpos con `Elo=1500`.
- [x] `.env` plantillas con `MAIA_PROVIDER=maia3` y `MAIA3_*` ([OpenSpec §3](./spar-01-openspec-maia3.md)).
- [x] Evidencia en [maia_mocktest.md](../roadmap/deep_analysis/sources/maia_mocktest.md).
- [x] Decisión **Maia-3** + licencias en [spar-01-openspec-maia3.md](./spar-01-openspec-maia3.md); Lc0 = fallback §8.
- [x] `load_maia_settings()` en `src/modules/sparring/maia_settings.py` (SPAR-03 consume `build_uci_argv`).

---

## 8. Fallback Lc0 + Maia-2 (opcional)

Si Maia-3 no está disponible en un entorno (CI sin HF, air-gap):

- `MAIA_PROVIDER=lc0_maia2`
- `MAIA_ENGINE_PATH=C:\chessengines\lc0\lc0.exe`
- `MAIA_WEIGHTS_DIR=C:\chessengines\maia`
- Smoke Lc0: `go nodes 1` — ver evidencia 2026-10-27 en [maia_mocktest.md](../roadmap/deep_analysis/sources/maia_mocktest.md).

---

## 9. Referencias

- [architecture-shared-analysis-platform.md](../roadmap/deep_analysis/architecture-shared-analysis-platform.md) — perfil `maia`.
- [spec_sparring_maia_stockfish_unificado.md](../../spec_sparring_maia_stockfish_unificado.md) §3.1 HumanMoveModel.
