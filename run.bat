@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul
title PokeTracker FastAPI
set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY where python >nul 2>nul && set "PY=python"
if not defined PY (
 echo [ERROR] Python 3 не найден. Установите Python 3.11+ и включите Add Python to PATH.
 pause
 exit /b 1
)
%PY% -c "import fastapi, uvicorn" >nul 2>nul
if errorlevel 1 (
 echo Зависимости отсутствуют или повреждены. Устанавливаю requirements.txt...
 %PY% -m pip install --upgrade pip
 if errorlevel 1 goto :install_error
 %PY% -m pip install -r requirements.txt
 if errorlevel 1 goto :install_error
)
%PY% -c "import fastapi, uvicorn" >nul 2>nul
if errorlevel 1 goto :install_error
echo Запуск PokeTracker FastAPI...
%PY% -m uvicorn fastapi_app.main:app --host 127.0.0.1 --port 8000
if errorlevel 1 (
 echo Сервер завершился с ошибкой. Проверьте сообщения выше.
 pause
)
exit /b 0
:install_error
echo [ERROR] Не удалось установить зависимости. Проверьте интернет и вывод pip выше.
pause
exit /b 1
