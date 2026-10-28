# Evidencia smoke · motor Maia (SPAR-01)

**Actualizado:** 2026-10-28 · **SPAR-01:** ✅ Done ([OpenSpec](../../devops/spar-01-openspec-maia3.md))
**Decisión:** Sparring usará **Maia-3** UCI ([maia3](https://github.com/CSSLab/maia3)). Runbook: [spar-01-maia-local-windows.md](../../devops/spar-01-maia-local-windows.md).

---

## Maia-3 (camino principal) — OK 2026-10-27

| Campo | Valor |
|-------|--------|
| Entorno | `chess_trainer` (conda), repo clonado `C:\src\maia3` |
| Instalación | `python -m pip install .` |
| Comando UCI | `maia3-5m` y `python -m maia3.uci --model maia3-5m --device cpu --no-use-amp` |
| Checkpoint | `C:\Users\sergiosal\.cache\huggingface\hub\models--UofTCSSLab--Maia3-5M\snapshots\b6559de2398d7140b985f28fd2c19fb5e47ddabe\maia3-5m.pt` |
| Device | CPU (`--no-use-amp`) |
| Elo smoke | `1500` |
| Jugada | `bestmove e2e4` (startpos, `go nodes 1`) |

### python-chess (SPAR-03 contrato)

```powershell
python -c "import chess, chess.engine; e=chess.engine.SimpleEngine.popen_uci(['maia3-5m']); e.configure({'Elo':1500}); print(e.play(chess.Board(), chess.engine.Limit(nodes=1)).move); e.quit()"
```

```text
resolving Maia3 checkpoint for Maia3 5M
loading Maia3 checkpoint ...\maia3-5m.pt
Maia3 ready
e2e4
```

### UCI por stdin (PowerShell)

```powershell
@(
  "uci","isready","setoption name Elo value 1500",
  "position startpos","go nodes 1","quit"
) | python -m maia3.uci --model maia3-5m --device cpu --no-use-amp
```

Extracto (criterio SPAR-01 cumplido):

```text
id name Maia3
uciok
Maia3 ready
readyok
info depth 1 multipv 1 score cp 138 wdl 556 26 418 pv e2e4
… multipv 2…5 …
bestmove e2e4
```

**Notas:** Al pipear varios comandos juntos, Maia-3 puede repetir líneas `option` / `uciok` y cargar el checkpoint más de una vez; no impide `readyok` + `bestmove`. Para smoke limpio, usar sesión interactiva o un solo `isready` tras `uci`.

---

## Lc0 + Maia-2 (fallback opcional) — OK 2026-10-27

Validación previa antes de fijar Maia-3. **No** es el motor elegido para producto; conservada por si `MAIA_PROVIDER=lc0_maia2`.

| Campo | Valor |
|-------|--------|
| Lc0 | `C:\chessengines\lc0\lc0.exe` v0.32.1 |
| Pesos | `C:\chessengines\maia\maia-1500.pb.gz` |
| Backend | BLAS / DNNL (CPU) |
| Latencia | ~34 ms (`go nodes 1`, startpos) |
| Jugada | `bestmove e2e4` |

Extracto:

```text
Loading weights file from: C:\chessengines\maia\maia-1500.pb.gz
uciok
readyok
info depth 1 ... nodes 1 score cp 99 ... pv e2e4
bestmove e2e4
```
