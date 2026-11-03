@echo off
title Atmiya Dosa Hub - POS Launcher
color 0A
cls
echo ===================================================================
echo             ATMIYA DOSA HUB - CLOUD POS LAUNCHER
echo                 Powered by OptiMap Solution
echo ===================================================================
echo.

echo [1/2] Launching FastAPI Backend on Port 5000...
start "Atmiya POS Backend (Port 5000)" cmd /k "title POS Backend :5000 && cd /d "%~dp0" && .\backend\.venv\Scripts\python.exe backend/run.py"

timeout /t 2 /nobreak >nul

echo [2/2] Launching Vite Frontend on Port 5173...
start "Atmiya POS Frontend (Port 5173)" cmd /k "title POS Frontend :5173 && cd /d "%~dp0frontend" && npm run dev -- --host 0.0.0.0"

echo.
echo ===================================================================
echo  ALL SERVERS ARE NOW RUNNING!
echo.
echo  - Local Web App:     http://localhost:5173
echo  - Unified App & API: http://localhost:5000
echo  - Interactive Docs:  http://localhost:5000/docs
echo ===================================================================
echo.
pause
