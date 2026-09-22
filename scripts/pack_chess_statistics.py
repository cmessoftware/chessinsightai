"""Pack chess_statistics into a Windows folder that runs without Python.

From the repo root:

    python scripts/pack_chess_statistics.py

Output: dist/chess_statistics_portable/
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
ENTRY = SRC / "chess_statistics" / "__main__.py"
DIST = ROOT / "dist" / "chess_statistics_portable"
WORK = ROOT / "build" / "chess_statistics_pack"

ENV_EXAMPLE = """LICHESS_API_TOKEN=lip_pegale_tu_token_aqui
STOCKFISH_PATH=stockfish.exe
"""

README = """Chess statistics (ChessInsightAI) — carpeta portable
====================================================

No hace falta instalar Python. Copiá ESTA CARPETA completa a la otra PC.

1. Copiá .env.example a .env
   - Lichess: pegá el token de https://lichess.org/account/oauth/token
   - Chess.com y PGN local: el token de Lichess no hace falta
2. Poné stockfish.exe en esta carpeta y dejá STOCKFISH_PATH=stockfish.exe
   (obligatorio para --source chess.com y --source pgn; en Lichess solo si no hay evals de nube)
3. Abrí cmd o PowerShell en esta carpeta:

   chess_statistics.exe --help

   chess_statistics.exe sync --username TU_USER --source lichess --perf-type rapid --max-games 20
   chess_statistics.exe sync --username TU_USER --source chess.com --since 2026-01-01 --perf-type rapid
   chess_statistics.exe sync --username TU_USER --source pgn --from-pgn partidas.pgn
   chess_statistics.exe analyze --username TU_USER --only-missing
   chess_statistics.exe export --username TU_USER --training --since 2026-07-01 --output chess_statistics.xlsx
   chess_statistics.exe stats --username TU_USER --training --since 2026-07-01
   chess_statistics.exe stats --username TU_USER --training --profile-out player_training_profile.json

analyze --only-missing: completa indicadores (precisión, juicios) en partidas ya
guardadas en SQLite que quedaron sin Stockfish (por ejemplo si se interrumpió un sync).
Requiere stockfish.exe. No vuelve a bajar partidas.

SQLite y Excel se crean en la carpeta desde la que ejecutás el comando
(data\\chess_statistics.sqlite por defecto). Cerrá el .xlsx antes de export.

Se ignoran partidas contra motores (AI Lichess) y de menos de 10 jugadas.
--source lichess usa evals de nube de Lichess. chess.com y pgn usan Stockfish local
(mismos indicadores de precisión; no mezclar nube Lichess con SF local en el mismo recorte).

Solo Windows x64. El antivirus a veces bloquea el .exe de PyInstaller a la primera.
"""


def main() -> int:
    DIST.mkdir(parents=True, exist_ok=True)
    WORK.mkdir(parents=True, exist_ok=True)
    print(f"Using {sys.executable}")
    subprocess.check_call(
        [sys.executable, "-m", "pip", "install", "-q", "pyinstaller>=6.0", "openpyxl==3.1.5"]
    )
    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--clean",
        "--onefile",
        "--console",
        "--name",
        "chess_statistics",
        "--paths",
        str(SRC),
        "--distpath",
        str(DIST),
        "--workpath",
        str(WORK),
        "--specpath",
        str(WORK),
        "--collect-all",
        "chess",
        "--collect-all",
        "openpyxl",
        "--hidden-import",
        "chess_statistics",
        "--hidden-import",
        "chess_statistics.cli",
        "--hidden-import",
        "chess_statistics.client",
        "--hidden-import",
        "chess_statistics.pgn_source",
        "--hidden-import",
        "chess_statistics.chesscom_client",
        "--hidden-import",
        "chess_statistics.aggregates",
        "--hidden-import",
        "chess_statistics.learning_events",
        "--hidden-import",
        "chess_statistics.training_profile",
        "--hidden-import",
        "chess_statistics.motifs",
        "--hidden-import",
        "chess_statistics.ratings",
        "--hidden-import",
        "chess_statistics.training_track",
        "--hidden-import",
        "modules.pgn_utils",
        "--hidden-import",
        "dotenv",
        "--hidden-import",
        "requests",
        "--hidden-import",
        "certifi",
        "--hidden-import",
        "charset_normalizer",
        "--exclude-module",
        "matplotlib",
        "--exclude-module",
        "numpy",
        "--exclude-module",
        "pandas",
        "--exclude-module",
        "scipy",
        "--exclude-module",
        "sklearn",
        "--exclude-module",
        "torch",
        "--exclude-module",
        "tensorflow",
        "--exclude-module",
        "streamlit",
        "--exclude-module",
        "jupyter",
        "--exclude-module",
        "nbconvert",
        "--exclude-module",
        "IPython",
        str(ENTRY),
    ]
    print("Running PyInstaller...")
    subprocess.check_call(cmd)
    (DIST / ".env.example").write_text(ENV_EXAMPLE, encoding="utf-8")
    (DIST / "LEEME.txt").write_text(README, encoding="utf-8")
    for candidate in (ROOT / "bin" / "stockfish.exe", ROOT / "stockfish.exe"):
        if candidate.is_file():
            shutil.copy2(candidate, DIST / "stockfish.exe")
            print("Copied stockfish.exe into portable folder")
            break
    print(f"\nListo: {DIST}")
    print("Compartí esa carpeta (exe + .env.example + LEEME.txt).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
