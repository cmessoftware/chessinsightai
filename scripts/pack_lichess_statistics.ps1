# Pack LS01 (lichess_statistics) into a Windows folder that other PCs can run
# without installing Python.
#
# From the repo root:
#   python scripts/pack_lichess_statistics.py
#   powershell -ExecutionPolicy Bypass -File scripts/pack_lichess_statistics.ps1
#
# Output: dist/lichess_statistics_portable/
# Copy that whole folder. Recipients need a Lichess token in .env next to the exe.
# Stockfish is optional (only for games without Lichess cloud analysis).

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

$Py = (Get-Command python -ErrorAction Stop).Source
Write-Host "Using $Py"

& $Py -m pip install -q "pyinstaller>=6.0" "openpyxl==3.1.5"

$Dist = Join-Path $Root "dist\lichess_statistics_portable"
$Work = Join-Path $Root "build\lichess_statistics_pack"
New-Item -ItemType Directory -Force -Path $Dist, $Work | Out-Null

$Args = @(
    "-m", "PyInstaller",
    "--noconfirm",
    "--clean",
    "--onefile",
    "--console",
    "--name", "lichess_statistics",
    "--paths", (Join-Path $Root "src"),
    "--distpath", $Dist,
    "--workpath", $Work,
    "--specpath", $Work,
    "--collect-all", "chess",
    "--collect-all", "openpyxl",
    "--hidden-import", "lichess_statistics",
    "--hidden-import", "lichess_statistics.cli",
    "--hidden-import", "lichess_statistics.client",
    "--hidden-import", "lichess_statistics.pgn_source",
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
    (Join-Path $Root "src\lichess_statistics\__main__.py")
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
Lichess statistics (ChessInsightAI) — carpeta portable
======================================================

No hace falta instalar Python. Copiá ESTA CARPETA completa a la otra PC.

1. Copiá .env.example a .env y pegá tu token de https://lichess.org/account/oauth/token
2. (Opcional) Poné stockfish.exe en esta carpeta y dejá STOCKFISH_PATH=stockfish.exe
   para analizar partidas que Lichess no trae evaluadas.
3. Abrí cmd o PowerShell en esta carpeta:

   lichess_statistics.exe --help

   lichess_statistics.exe sync --username TU_USER --perf-type rapid --max-games 20
   lichess_statistics.exe sync --username TU_USER --from-pgn partidas.pgn --force-stockfish
   lichess_statistics.exe export --username TU_USER --last-n 20 --output lichess_statistics.xlsx
   lichess_statistics.exe stats --username TU_USER --perf-type rapid --last-n 20

SQLite y Excel se crean en la carpeta desde la que ejecutás el comando
(data\lichess_statistics.sqlite por defecto).

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
