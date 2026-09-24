"""Pack lichess_statistics into a Windows folder that runs without Python.

From the repo root:

    python scripts/pack_lichess_statistics.py

Output: dist/lichess_statistics_portable/
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
ENTRY = SRC / "lichess_statistics" / "__main__.py"
DIST = ROOT / "dist" / "lichess_statistics_portable"
WORK = ROOT / "build" / "lichess_statistics_pack"

ENV_EXAMPLE = """LICHESS_API_TOKEN=lip_pegale_tu_token_aqui
STOCKFISH_PATH=stockfish.exe
"""

README = """Lichess statistics (ChessInsightAI) — carpeta portable
======================================================

No hace falta instalar Python. Copiá ESTA CARPETA completa a la otra PC.

1. Copiá .env.example a .env y pegá tu token de https://lichess.org/account/oauth/token
2. (Opcional) Poné stockfish.exe en esta carpeta y dejá STOCKFISH_PATH=stockfish.exe
   para analizar partidas que Lichess no trae evaluadas.
3. Abrí cmd o PowerShell en esta carpeta:

   lichess_statistics.exe --help

   lichess_statistics.exe sync --username TU_USER --perf-type rapid --max-games 20
   lichess_statistics.exe sync --username TU_USER --from-pgn export_lichess.pgn --force-stockfish
   lichess_statistics.exe export --username TU_USER --last-n 20 --output lichess_statistics.xlsx
   lichess_statistics.exe stats --username TU_USER --perf-type rapid --last-n 20

SQLite y Excel se crean en la carpeta desde la que ejecutás el comando
(data\\lichess_statistics.sqlite por defecto).

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
        "lichess_statistics",
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
        "lichess_statistics",
        "--hidden-import",
        "lichess_statistics.cli",
        "--hidden-import",
        "lichess_statistics.client",
        "--hidden-import",
        "lichess_statistics.pgn_source",
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
