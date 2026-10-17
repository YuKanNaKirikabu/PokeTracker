@echo off
setlocal EnableExtensions
cd /d "%~dp0"
chcp 65001 >nul
title PokeTracker FastAPI

set "PORT=1025"
set "HOST=localhost"
set "AUTO_OPEN_BROWSER=1"
set "SAFE_MODE=0"
set "REMOTE_DATA_BASE_URL=https://storage.yandexcloud.net/poketracker/data"
set "REMOTE_WRITE=1"
set "MONGODB_URI=mongodb://127.0.0.1:27017"
set "MONGODB_DATABASE=poketracker"
if exist "%~dp0run.config.bat" call "%~dp0run.config.bat"

set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY where python >nul 2>nul && set "PY=python"
if not defined PY (
 echo [ERROR] Python 3.11+ not found. Install Python and enable Add Python to PATH.
 pause
 exit /b 1
)

%PY% -c "import fastapi, uvicorn, pymongo" >nul 2>nul
if errorlevel 1 (
 echo Dependencies missing or broken. Installing requirements.txt...
 %PY% -m pip install -r requirements.txt
 if errorlevel 1 goto :install_error
)
%PY% -c "import fastapi, uvicorn, pymongo" >nul 2>nul
if errorlevel 1 goto :install_error

set "POKETRACKER_PORT=%PORT%"
set "POKETRACKER_HOST=%HOST%"
set "POKETRACKER_SAFE_MODE=%SAFE_MODE%"
set "POKETRACKER_DATA_BASE_URL=%REMOTE_DATA_BASE_URL%"
set "POKETRACKER_REMOTE_WRITE=%REMOTE_WRITE%"
set "MONGODB_URI=%MONGODB_URI%"
set "MONGODB_DATABASE=%MONGODB_DATABASE%"

if /I "%AUTO_OPEN_BROWSER%"=="1" start "" "http://localhost:%PORT%/"
echo Starting PokeTracker FastAPI at http://localhost:%PORT%/
echo Stop the server with Ctrl+C.
%PY% -m uvicorn fastapi_app.main:app --host %HOST% --port %PORT%
if errorlevel 1 (
 echo.
 echo [ERROR] Server stopped with an error. Read the traceback above.
 pause
)
exit /b 0

:install_error
echo [ERROR] Failed to install Python dependencies from requirements.txt.
pause
exit /b 1
