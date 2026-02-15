@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 > nul
cls

echo.
echo   ========================================
echo   PokeTracker - Pokemon TCG Pocket Tracker
echo   ========================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% equ 0 (
	echo   Starting server with data persistence...
	echo   http://localhost:1025
	echo.
	echo   Data file: data/collection.json
	echo   Auto-save: Enabled
	echo   Log window: Enabled
	echo   Press Ctrl+C to stop
	echo.
	cd /d %~dp0
	if not exist "%~dp0data" mkdir "%~dp0data"
	if not exist "%~dp0data\logs" mkdir "%~dp0data\logs"
	for /f %%i in ('powershell -NoLogo -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "RUN_TS=%%i"
	set "LOG_FILE=%~dp0data\logs\server-!RUN_TS!.log"
	echo ======================================== > "!LOG_FILE!"
	echo PokeTracker server log >> "!LOG_FILE!"
	echo Started at %date% %time% >> "!LOG_FILE!"
	echo ======================================== >> "!LOG_FILE!"
	echo   Live log file: data/logs/server-!RUN_TS!.log
	start "PokeTracker Logs" cmd /k powershell -NoLogo -NoProfile -Command "Get-Content -Path '!LOG_FILE!' -Wait -Encoding UTF8"
	timeout /t 2
	start http://localhost:1025
	python -u "%~dp0server\server.py" >> "!LOG_FILE!" 2>&1
) else (
	echo   Error: Python not found
	echo.
	echo   Solution: Install Python from https://www.python.org/downloads/
	echo.
	timeout /t 5
	exit /b 1
)
