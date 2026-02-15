@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 > nul
mode con cols=240 lines=50 >nul 2>&1
cls

set "SCRIPT_DIR=%~dp0"
set "CONFIG_FILE=%SCRIPT_DIR%run.config.bat"
set "PORT=1025"
set "HOST=localhost"
set "AUTO_OPEN_BROWSER=1"
set "START_MINIMIZED=0"
set "SAFE_MODE=0"
set "STARTUP_SUMMARY_MODE=full"
set "CONSOLE_LOG_MODE=same"
set "FILE_LOG_KEEP_COUNT=0"

if exist "%CONFIG_FILE%" call "%CONFIG_FILE%"

set "PORT_NUM=%PORT%"
2>nul set /a PORT_NUM=%PORT_NUM%
if "%PORT_NUM%"=="" set "PORT_NUM=1025"
if %PORT_NUM% LSS 1 set "PORT_NUM=1025"
if %PORT_NUM% GTR 65535 set "PORT_NUM=1025"
set "PORT=%PORT_NUM%"

if /I not "%AUTO_OPEN_BROWSER%"=="0" if /I not "%AUTO_OPEN_BROWSER%"=="1" set "AUTO_OPEN_BROWSER=1"
if /I not "%START_MINIMIZED%"=="0" if /I not "%START_MINIMIZED%"=="1" set "START_MINIMIZED=0"
if /I not "%SAFE_MODE%"=="0" if /I not "%SAFE_MODE%"=="1" set "SAFE_MODE=0"
if /I not "%HOST%"=="localhost" if /I not "%HOST%"=="0.0.0.0" set "HOST=localhost"
if /I not "%STARTUP_SUMMARY_MODE%"=="full" if /I not "%STARTUP_SUMMARY_MODE%"=="compact" if /I not "%STARTUP_SUMMARY_MODE%"=="off" set "STARTUP_SUMMARY_MODE=full"

if /I not "%CONSOLE_LOG_MODE%"=="same" if /I not "%CONSOLE_LOG_MODE%"=="separate" if /I not "%CONSOLE_LOG_MODE%"=="off" set "CONSOLE_LOG_MODE=same"

set "KEEP_COUNT=%FILE_LOG_KEEP_COUNT%"
2>nul set /a KEEP_COUNT=%KEEP_COUNT%
if "%KEEP_COUNT%"=="" set "KEEP_COUNT=0"
if %KEEP_COUNT% LSS 0 set "KEEP_COUNT=0"
set "FILE_LOG_KEEP_COUNT=%KEEP_COUNT%"

set "APP_URL=http://localhost:%PORT%"
set "APP_URL_BIND=http://%HOST%:%PORT%"
set "LAN_IP="
set "LAN_URL="
if /I "%HOST%"=="0.0.0.0" call :detect_lan_ip

if /I not "%STARTUP_SUMMARY_MODE%"=="off" (
	call :print_run_banner
)

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% equ 0 (
	if /I "%STARTUP_SUMMARY_MODE%"=="full" (
		echo   Starting server with data persistence...
		echo   Local URL: %APP_URL%
		if /I "%HOST%"=="0.0.0.0" (
			echo   Host mode: LAN ^(0.0.0.0^)
			if defined LAN_URL (
				echo   LAN URL: %LAN_URL%
			) else (
				echo   LAN URL: unavailable ^(could not auto-detect local IP^)
			)
		) else (
			echo   Host mode: localhost ^(this PC only^)
		)
		echo.
		echo   Data file: data/collection.json
		echo   Auto-save: Enabled
		if "%FILE_LOG_KEEP_COUNT%"=="0" (
			echo   File logs: disabled ^(0 files kept^)
		) else (
			echo   File logs: enabled ^(keep %FILE_LOG_KEEP_COUNT% file^(s^)^)
		)
		echo   Console logs: %CONSOLE_LOG_MODE%
		echo   Browser auto-open: %AUTO_OPEN_BROWSER%
		echo   Start minimized: %START_MINIMIZED%
		echo   Safe mode: %SAFE_MODE%
		echo   Summary mode: %STARTUP_SUMMARY_MODE%
		echo   Press Ctrl+C to stop
		echo.
	) else if /I "%STARTUP_SUMMARY_MODE%"=="compact" (
		echo   Local URL: %APP_URL%
		if /I "%HOST%"=="0.0.0.0" if defined LAN_URL echo   LAN URL: %LAN_URL%
		echo   Logs: console=%CONSOLE_LOG_MODE%, files=%FILE_LOG_KEEP_COUNT% ^| Safe=%SAFE_MODE% ^| Host=%HOST%
		echo.
	)
	cd /d "%SCRIPT_DIR%"
	if not exist "%SCRIPT_DIR%data" mkdir "%SCRIPT_DIR%data"
	if not "%FILE_LOG_KEEP_COUNT%"=="0" (
		if not exist "%SCRIPT_DIR%data\logs" mkdir "%SCRIPT_DIR%data\logs"
		for /f %%i in ('powershell -NoLogo -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "RUN_TS=%%i"
		set "LOG_FILE=%SCRIPT_DIR%data\logs\server-!RUN_TS!.log"
		echo ======================================== > "!LOG_FILE!"
		echo PokeTracker server log >> "!LOG_FILE!"
		echo Started at %date% %time% >> "!LOG_FILE!"
		echo URL: %APP_URL_BIND% >> "!LOG_FILE!"
		echo Port: %PORT% ^| Safe mode: %SAFE_MODE% >> "!LOG_FILE!"
		echo ======================================== >> "!LOG_FILE!"
		if /I not "%STARTUP_SUMMARY_MODE%"=="off" echo   Active log file: data/logs/server-!RUN_TS!.log
		for /f "skip=%FILE_LOG_KEEP_COUNT% delims=" %%F in ('dir /b /a-d /o-d "%SCRIPT_DIR%data\logs\server-*.log" 2^>nul') do del /q "%SCRIPT_DIR%data\logs\%%F" >nul 2>&1
	) else (
		if exist "%SCRIPT_DIR%data\logs" rmdir /s /q "%SCRIPT_DIR%data\logs" >nul 2>&1
	)

	set "POKETRACKER_PORT=%PORT%"
	set "POKETRACKER_SAFE_MODE=%SAFE_MODE%"
	set "POKETRACKER_HOST=%HOST%"

	if "%START_MINIMIZED%"=="1" (
		powershell -NoLogo -NoProfile -Command "Add-Type -Name Win -Namespace Native -MemberDefinition '[DllImport(\"kernel32.dll\")]public static extern IntPtr GetConsoleWindow();[DllImport(\"user32.dll\")]public static extern bool ShowWindow(IntPtr hWnd,int nCmdShow);'; $h=[Native.Win]::GetConsoleWindow(); [Native.Win]::ShowWindow($h,2) ^| Out-Null" >nul 2>&1
	)

	if "%AUTO_OPEN_BROWSER%"=="1" start "" "%APP_URL%"

	if /I "%CONSOLE_LOG_MODE%"=="same" (
		if "%FILE_LOG_KEEP_COUNT%"=="0" (
			python -u "%SCRIPT_DIR%server\server.py"
		) else (
			powershell -NoLogo -NoProfile -Command "& { python -u '%SCRIPT_DIR%server\server.py' 2>&1 | Tee-Object -FilePath '!LOG_FILE!' -Append }"
		)
	) else if /I "%CONSOLE_LOG_MODE%"=="off" (
		if "%FILE_LOG_KEEP_COUNT%"=="0" (
			python -u "%SCRIPT_DIR%server\server.py" >nul 2>&1
		) else (
			python -u "%SCRIPT_DIR%server\server.py" >> "!LOG_FILE!" 2>&1
		)
	) else (
		for /f %%i in ('powershell -NoLogo -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "RUN_TS_CONSOLE=%%i"
		set "RUNTIME_CONSOLE_LOG=%TEMP%\poketracker-console-!RUN_TS_CONSOLE!.log"
		type nul > "!RUNTIME_CONSOLE_LOG!"
		if "%START_MINIMIZED%"=="1" (
			start "PokeTracker Console" /min cmd /c "mode con cols=240 lines=50 >nul & powershell -NoLogo -NoProfile -Command \"Get-Content -Path '!RUNTIME_CONSOLE_LOG!' -Wait -Encoding UTF8\""
		) else (
			start "PokeTracker Console" cmd /c "mode con cols=240 lines=50 >nul & powershell -NoLogo -NoProfile -Command \"Get-Content -Path '!RUNTIME_CONSOLE_LOG!' -Wait -Encoding UTF8\""
		)
		if "%FILE_LOG_KEEP_COUNT%"=="0" (
			powershell -NoLogo -NoProfile -Command "& { python -u '%SCRIPT_DIR%server\server.py' 2>&1 | Tee-Object -FilePath '!RUNTIME_CONSOLE_LOG!' -Append > $null }"
		) else (
			powershell -NoLogo -NoProfile -Command "& { python -u '%SCRIPT_DIR%server\server.py' 2>&1 | Tee-Object -FilePath '!RUNTIME_CONSOLE_LOG!' -Append | Tee-Object -FilePath '!LOG_FILE!' -Append > $null }"
		)
		del /q "!RUNTIME_CONSOLE_LOG!" >nul 2>&1
	)
) else (
	echo   Error: Python not found
	echo.
	echo   Solution: Install Python from https://www.python.org/downloads/
	echo.
	timeout /t 5
	exit /b 1
)

goto :eof

:print_run_banner
echo.
echo.
if exist "%SCRIPT_DIR%banners\run-banner.txt" (
	type "%SCRIPT_DIR%banners\run-banner.txt"
) else (
	echo   ========================================
	echo   PokeTracker - Pokemon TCG Pocket Tracker
	echo   ========================================
)
echo.
exit /b 0

:detect_lan_ip
for /f %%i in ('powershell -NoLogo -NoProfile -Command "$ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue ^| Where-Object { $_.IPAddress -notlike ''169.254.*'' -and $_.IPAddress -ne ''127.0.0.1'' }; if ($ips) { $ips[0].IPAddress } else { $fallback = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) ^| Where-Object { $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and $_.IPAddressToString -ne ''127.0.0.1'' -and $_.IPAddressToString -notlike ''169.254.*'' }; if ($fallback) { $fallback[0].IPAddressToString } }"') do set "LAN_IP=%%i"
if defined LAN_IP set "LAN_URL=http://%LAN_IP%:%PORT%"
exit /b 0
