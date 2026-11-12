@echo off
setlocal
cd /d "%~dp0"
echo.
echo  SKILLPATH / LOCAL DEVELOPMENT
echo  =============================
echo.
where npm >nul 2>&1
if errorlevel 1 (
  echo Node.js / npm is required. Install Node.js 20+ and rerun.
  pause
  exit /b 1
)
if not exist "frontend\node_modules" (
  echo Installing frontend packages...
  pushd frontend
  call npm install
  if errorlevel 1 (popd & echo npm install failed. & pause & exit /b 1)
  popd
)
if not exist ".venv\Scripts\python.exe" (
  echo Creating Python virtual environment...
  py -3 -m venv ".venv" >nul 2>&1
  if errorlevel 1 python -m venv ".venv"
)
if exist ".venv\Scripts\python.exe" (
  if not exist ".venv\.skillpath-deps-installed" (
    echo Installing FastAPI dependencies...
    ".venv\Scripts\python.exe" -m pip install -r "backend\requirements.txt"
    if errorlevel 1 (
      echo FastAPI packages could not be installed; browser demo mode will still work.
    ) else (
      echo ready> ".venv\.skillpath-deps-installed"
    )
  )
  if exist ".venv\.skillpath-deps-installed" (
    echo Starting FastAPI server on http://127.0.0.1:8000
    start "SkillPath API" cmd /k "cd /d ""%~dp0backend"" && ""%~dp0.venv\Scripts\python.exe"" -m uvicorn app.main:app --reload --port 8000"
  )
) else (
  echo Python unavailable. Frontend will use local browser demo data.
)
echo Starting React frontend on http://localhost:5173
start "SkillPath Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"
echo.
echo Browser: http://localhost:5173
echo API (if installed): http://127.0.0.1:8000/docs
echo.
endlocal
