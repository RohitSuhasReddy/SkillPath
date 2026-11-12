# SkillPath: start the EXISTING backend and frontend environments.
# No pip install, npm install, venv creation or downloads on every launch.
$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

if (!(Test-Path -LiteralPath (Join-Path $frontend "package.json"))) {
    throw "SkillPath frontend not found. Run this script from the SkillPath repository."
}

if (!(Test-Path -LiteralPath (Join-Path $frontend "node_modules"))) {
    throw "Frontend packages aren't installed yet. Run 'cd frontend; npm install' ONCE, then .\run-dev.ps1."
}

if (!(Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw "Node.js/npm isn't available. Install Node.js first."
}

$pythonCandidates = @(
    (Join-Path $root ".venv\Scripts\python.exe"),
    (Join-Path $backend ".venv\Scripts\python.exe"),
    (Join-Path $root "venv\Scripts\python.exe"),
    (Join-Path $backend "venv\Scripts\python.exe")
)
$pythonExe = $pythonCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

# Allow a system Python if uvicorn and FastAPI are already installed there.
if (-not $pythonExe) {
    $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
    if ($pythonCmd) { $pythonExe = $pythonCmd.Source }
}

if (-not $pythonExe) {
    throw "Python not found. Create the environment once: python -m venv .venv ; .\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt"
}

$previousErrorActionPreference = $ErrorActionPreference
try {
    # PowerShell 5.1 treats a Python traceback on stderr as NativeCommandError.
    # Allow the probe to finish, then check its exit code rather than crashing.
    $ErrorActionPreference = "Continue"
    & $pythonExe -c "import uvicorn, fastapi, sklearn, dotenv, google.genai" 2>$null
    $dependenciesAvailable = ($LASTEXITCODE -eq 0)
} finally {
    $ErrorActionPreference = $previousErrorActionPreference
}
if (-not $dependenciesAvailable) {
    $requirements = Join-Path $backend "requirements.txt"
    Write-Host ""
    Write-Host "SkillPath needs a ONE-TIME backend dependency update." -ForegroundColor Yellow
    Write-Host "Run this command from the SkillPath folder:" -ForegroundColor Gray
    Write-Host ('& "' + $pythonExe + '" -m pip install -r "' + $requirements + '"') -ForegroundColor Cyan
    Write-Host "Then run .\run-dev.ps1 again. Subsequent launches won't reinstall." -ForegroundColor Gray
    return
}

Write-Host ""
Write-Host "SKILLPATH / QUICK LAUNCH" -ForegroundColor White
Write-Host "Using existing dependencies; no installs or downloads." -ForegroundColor DarkGray
Write-Host "Backend  http://127.0.0.1:8000" -ForegroundColor Gray
Write-Host "Frontend http://localhost:5173" -ForegroundColor Gray
Write-Host ""

# Start-Process preserves separate, visible consoles; quote paths with spaces.
$escapedPython = $pythonExe.Replace("'", "''")
$backendCommand = "& '$escapedPython' -m uvicorn app.main:app --reload --port 8000"
Start-Process -FilePath "powershell.exe" -WorkingDirectory $backend -ArgumentList @("-NoExit", "-Command", $backendCommand)
Start-Process -FilePath "powershell.exe" -WorkingDirectory $frontend -ArgumentList @("-NoExit", "-Command", "npm.cmd run dev")

Write-Host "Both servers launched in separate PowerShell windows." -ForegroundColor Green
