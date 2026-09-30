@echo off
echo ====================================================
echo Starting Community Issue Reporting System
echo ====================================================

REM Start Backend Flask server in a new window
echo Starting Backend (Flask on http://127.0.0.1:5000)...
start "Community Reports Backend" cmd /k "cd /d %~dp0backend && ..\.venv\Scripts\python.exe app.py"

REM Start Frontend Vite server in a new window
echo Starting Frontend (Vite on http://localhost:5173)...
start "Community Reports Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

REM Wait 3 seconds and open in default browser
timeout /t 3 >nul
start http://localhost:5173

echo ====================================================
echo Both Backend and Frontend are now running!
echo Access the site at: http://localhost:5173
echo ====================================================
