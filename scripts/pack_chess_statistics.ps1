# Pack LS01 (chess_statistics) into a Windows folder that other PCs can run
# without installing Python.
#
# From the repo root:
#   python scripts/pack_chess_statistics.py
#   powershell -ExecutionPolicy Bypass -File scripts/pack_chess_statistics.ps1
#
# Output: dist/chess_statistics_portable/
# Copy that whole folder. Recipients need a Lichess token in .env next to the exe.
# Stockfish is optional (only for games without Lichess cloud analysis).

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

$Py = (Get-Command python -ErrorAction Stop).Source
Write-Host "Using $Py"

& $Py -m pip install -q "pyinstaller>=6.0" "openpyxl==3.1.5"

$Dist = Join-Path $Root "dist\chess_statistics_portable"
$Work = Join-Path $Root "build\chess_statistics_pack"
New-Item -ItemType Directory -Force -Path $Dist, $Work | Out-Null

$Args = @(
    "-m", "PyInstaller",
    "--noconfirm",
    "--clean",
    "--onefile",
    "--console",
    "--name", "chess_statistics",
    "--paths", (Join-Path $Root "src"),
    "--distpath", $Dist,
    "--workpath", $Work,
    "--specpath", $Work,
    "--collect-all", "chess",
    "--collect-all", "openpyxl",
    "--hidden-import", "chess_statistics",
    "--hidden-import", "chess_statistics.cli",
    "--hidden-import", "chess_statistics.client",
    "--hidden-import", "chess_statistics.pgn_source",
    "--hidden-import", "chess_statistics.chesscom_client",
    "--hidden-import", "modules.pgn_utils",
    "--hidden-import", "dotenv",
    "--hidden-import", "requests",
    "--hidden-import", "certifi",
    "--hidden-import", "charset_normalizer",
    "--exclude-module", "matplotlib",
    "--exclude-module", "numpy",
    "--exclude-module", "pandas",
    "--exclude-module", "scipy",
    "--exclude-module", "sklearn",
    "--exclude-module", "torch",
    "--exclude-module", "tensorflow",
    "--exclude-module", "streamlit",
    "--exclude-module", "jupyter",
    "--exclude-module", "nbconvert",
    "--exclude-module", "IPython",
    (Join-Path $Root "src\chess_statistics\__main__.py")
)

Write-Host "Running PyInstaller..."
& $Py @Args
if ($LASTEXITCODE -ne 0) { throw "PyInstaller failed with exit $LASTEXITCODE" }

$EnvExample = Join-Path $Dist ".env.example"
@"
LICHESS_API_TOKEN=lip_pegale_tu_token_aqui
STOCKFISH_PATH=stockfish.exe
"@ | Set-Content -Encoding utf8 $EnvExample

$Readme = Join-Path $Dist "LEEME.txt"
@"
Chess statistics (ChessInsightAI) — carpeta portable
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
   chess_statistics.exe export --username TU_USER --last-n 20 --output chess_statistics.xlsx
   chess_statistics.exe stats --username TU_USER --perf-type rapid --last-n 20

analyze --only-missing: completa indicadores (precisión, juicios) en partidas ya
guardadas en SQLite que quedaron sin Stockfish (por ejemplo si se interrumpió un sync).
Requiere stockfish.exe. No vuelve a bajar partidas.

SQLite y Excel se crean en la carpeta desde la que ejecutás el comando
(data\chess_statistics.sqlite por defecto). Cerrá el .xlsx antes de export.

Se ignoran partidas contra motores (AI Lichess) y de menos de 10 jugadas.
--source lichess usa evals de nube de Lichess. chess.com y pgn usan Stockfish local
(mismos indicadores de precisión; no mezclar nube Lichess con SF local en el mismo recorte).

Solo Windows x64. El antivirus a veces bloquea el .exe de PyInstaller a la primera.
"@ | Set-Content -Encoding utf8 $Readme

$StockCandidates = @(
    (Join-Path $Root "bin\stockfish.exe"),
    (Join-Path $Root "stockfish.exe")
)
foreach ($Sf in $StockCandidates) {
    if (Test-Path $Sf) {
        Copy-Item $Sf (Join-Path $Dist "stockfish.exe") -Force
        Write-Host "Copied stockfish.exe into portable folder"
        break
    }
}

Write-Host ""
Write-Host "Listo: $Dist"
Write-Host "Compartí esa carpeta (exe + .env.example + LEEME.txt)."
