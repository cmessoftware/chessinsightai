# Coach MVP local dev: Postgres (5434) + FastAPI (8000) + Vite (5173)
# Usage (from repo root):
#   .\scripts\start_coach_dev.ps1
#   .\scripts\start_coach_dev.ps1 -SkipDb
#   .\scripts\start_coach_dev.ps1 -ApiOnly

param(
    [switch]$SkipDb,
    [switch]$SkipApi,
    [switch]$SkipFront,
    [switch]$ApiOnly,
    [switch]$FrontOnly,
    [int]$ApiPort = 8000,
    [string]$CondaEnv = "chess_trainer",
    [string]$PythonPath = ""
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$ApiDir = Join-Path $RepoRoot "api"
$FrontDir = Join-Path $RepoRoot "frontend"
$PostgresContainer = "chessinsight-postgres"

if ($ApiOnly) { $SkipDb = $true; $SkipFront = $true }
if ($FrontOnly) { $SkipDb = $true; $SkipApi = $true }

function Write-Step([string]$Message) {
    Write-Host "`n>> $Message" -ForegroundColor Cyan
}

function Test-Command([string]$Name) {
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Resolve-PythonExe {
    if ($PythonPath -and (Test-Path $PythonPath)) {
        return (Resolve-Path $PythonPath).Path
    }

    # Shell ya activó el env correcto
    if ($env:CONDA_PREFIX -and (Test-Path (Join-Path $env:CONDA_PREFIX "python.exe"))) {
        if (-not $CondaEnv -or $env:CONDA_DEFAULT_ENV -eq $CondaEnv) {
            return (Join-Path $env:CONDA_PREFIX "python.exe")
        }
    }

    $candidates = @(
        (Join-Path $env:USERPROFILE "miniforge3\envs\$CondaEnv\python.exe"),
        (Join-Path $env:USERPROFILE "mambaforge\envs\$CondaEnv\python.exe"),
        (Join-Path $env:USERPROFILE "anaconda3\envs\$CondaEnv\python.exe")
    )
    foreach ($c in $candidates) {
        if ($c -and (Test-Path $c)) { return $c }
    }

    if (Test-Command conda) {
        $prevEap = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        try {
            $lines = & conda run -n $CondaEnv python -c "import sys; print(sys.executable)" 2>&1
            foreach ($line in $lines) {
                $t = "$line".Trim()
                if ($t -and (Test-Path $t)) { return $t }
            }
        }
        finally {
            $ErrorActionPreference = $prevEap
        }
    }

    $pyCmd = Get-Command python -ErrorAction SilentlyContinue
    if ($pyCmd) { return $pyCmd.Source }

    return $null
}

function Ensure-Postgres {
    Write-Step "PostgreSQL ($PostgresContainer on localhost:5434)"
    if (-not (Test-Command docker)) {
        Write-Host "Docker no está en PATH. Usa tu Postgres local y CHESS_TRAINER_DB_URL en .env." -ForegroundColor Yellow
        return
    }
    $existing = docker ps -a --filter "name=^/${PostgresContainer}$" --format "{{.Names}}" 2>$null
    if ($existing -eq $PostgresContainer) {
        docker start $PostgresContainer | Out-Null
        Write-Host "Contenedor iniciado." -ForegroundColor Green
    }
    else {
        & (Join-Path $RepoRoot "start_db.ps1")
        Write-Host "Contenedor creado e iniciado." -ForegroundColor Green
    }
    Start-Sleep -Seconds 2
}

function Start-ApiWindow {
    Write-Step "API FastAPI (http://127.0.0.1:${ApiPort})"
    $python = Resolve-PythonExe
    if (-not $python) {
        Write-Host "No se encontró Python para env '$CondaEnv'." -ForegroundColor Red
        Write-Host "  conda activate $CondaEnv" -ForegroundColor Gray
        Write-Host "  .\scripts\start_coach_dev.ps1 -SkipDb   # reintenta con el env activo" -ForegroundColor Gray
        Write-Host "  .\scripts\start_coach_dev.ps1 -PythonPath C:\...\envs\chess_trainer\python.exe" -ForegroundColor Gray
        return
    }
    Write-Host "Python: $python" -ForegroundColor DarkGray
    $cmd = @"
Set-Location '$ApiDir'
`$Host.UI.RawUI.WindowTitle = 'Coach API :$ApiPort'
Write-Host 'Docs: http://127.0.0.1:$ApiPort/docs' -ForegroundColor Green
& '$python' -m uvicorn main:app --host 127.0.0.1 --port $ApiPort --reload
"@
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd | Out-Null
    Write-Host "Ventana nueva: API" -ForegroundColor Green
}

function Start-FrontWindow {
    Write-Step "Frontend Vite (http://localhost:5173)"
    if (-not (Test-Command npm)) {
        Write-Host "npm no está en PATH." -ForegroundColor Red
        return
    }
    if (-not (Test-Path (Join-Path $FrontDir "node_modules"))) {
        Write-Host "Ejecuta una vez: cd ..\frontend && npm install" -ForegroundColor Yellow
    }
    $cmd = @"
Set-Location '$FrontDir'
`$Host.UI.RawUI.WindowTitle = 'Coach Frontend :5173'
Write-Host 'UI: http://localhost:5173  (pestaña Coach tras login)' -ForegroundColor Green
npm run dev
"@
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd | Out-Null
    Write-Host "Ventana nueva: Frontend" -ForegroundColor Green
}

Write-Host "`nCoach MVP dev — $RepoRoot" -ForegroundColor White

if (-not $SkipDb) { Ensure-Postgres }
if (-not $SkipApi) { Start-ApiWindow }
if (-not $SkipFront) { Start-FrontWindow }

Write-Step "Listo"
Write-Host @"
  DB:   postgresql://chess:***@localhost:5434/chess_trainer_db  (ver .env)
  API:  http://127.0.0.1:$ApiPort/docs
  UI:   http://localhost:5173  → login admin / admin123 → Coach

  Migraciones (si hace falta): alembic upgrade 20260923_000001
"@ -ForegroundColor Gray
