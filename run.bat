@echo off
reg add "HKCU\Console" /v FontSize /t REG_DWORD /d 1048576 /f >nul 2>&1
if /I not "%~1"=="__PT_MAXIMIZED" (
	start "" /max "%ComSpec%" /c ""%~f0" __PT_MAXIMIZED"
	exit /b
)
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 > nul
mode con cols=240 lines=50 >nul 2>&1
cls

set "SCRIPT_DIR=%~dp0"
set "CONFIG_FILE=%SCRIPT_DIR%run.config.bat"
set "PORT=1025"
set "HOST=0.0.0.0"
set "AUTO_OPEN_BROWSER=1"
set "START_MINIMIZED=0"
set "SAFE_MODE=0"
set "STARTUP_SUMMARY_MODE=full"
set "CONSOLE_LOG_MODE=same"
set "FILE_LOG_KEEP_COUNT=0"
set "REMOTE_DATA_BASE_URL=https://storage.yandexcloud.net/poketracker/data"
set "REMOTE_WRITE=1"

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
if /I not "%REMOTE_WRITE%"=="0" if /I not "%REMOTE_WRITE%"=="1" set "REMOTE_WRITE=0"

set "KEEP_COUNT=%FILE_LOG_KEEP_COUNT%"
2>nul set /a KEEP_COUNT=%KEEP_COUNT%
if "%KEEP_COUNT%"=="" set "KEEP_COUNT=0"
if %KEEP_COUNT% LSS 0 set "KEEP_COUNT=0"
set "FILE_LOG_KEEP_COUNT=%KEEP_COUNT%"

set "APP_URL=http://localhost:%PORT%"
set "APP_URL_BIND=http://%HOST%:%PORT%"
set "LOG_DIR=%TEMP%\poketracker\logs"
set "LAN_IP="
set "LAN_URL="
if /I "%HOST%"=="0.0.0.0" (
	call :detect_lan_ip
	call :try_open_firewall_port
)

if /I not "%STARTUP_SUMMARY_MODE%"=="off" (
	call :print_run_banner
)

REM Check if Python is available (prefer python, fall back to py launcher)
set "PYTHON_CMD="
python -c "import sys; print(sys.version_info[0])" >nul 2>&1
if %errorlevel% equ 0 (
	set "PYTHON_CMD=python"
) else (
	py -3 -c "import sys; print(sys.version_info[0])" >nul 2>&1
	if %errorlevel% equ 0 set "PYTHON_CMD=py -3"
)

if not "%PYTHON_CMD%"=="" (
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
			if "%FIREWALL_PORT_OPENED%"=="1" echo   Firewall: inbound TCP %PORT% allowed for Private profile
			if "%FIREWALL_PORT_OPENED%"=="0" echo   Firewall: could not auto-open ^(run as Administrator or allow python.exe/TCP %PORT%^)
		) else (
			echo   Host mode: localhost ^(this PC only^)
		)
		echo.
		if defined REMOTE_DATA_BASE_URL echo   Remote data URL: %REMOTE_DATA_BASE_URL%
		echo   Remote write: %REMOTE_WRITE%
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
	if not "%FILE_LOG_KEEP_COUNT%"=="0" (
		if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
		for /f %%i in ('powershell -NoLogo -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "RUN_TS=%%i"
		set "LOG_FILE=%LOG_DIR%\server-!RUN_TS!.log"
		echo ======================================== > "!LOG_FILE!"
		echo PokeTracker server log >> "!LOG_FILE!"
		echo Started at %date% %time% >> "!LOG_FILE!"
		echo URL: %APP_URL_BIND% >> "!LOG_FILE!"
		echo Port: %PORT% ^| Safe mode: %SAFE_MODE% >> "!LOG_FILE!"
		echo ======================================== >> "!LOG_FILE!"
		if /I not "%STARTUP_SUMMARY_MODE%"=="off" echo   Active log file: !LOG_FILE!
		for /f "skip=%FILE_LOG_KEEP_COUNT% delims=" %%F in ('dir /b /a-d /o-d "%LOG_DIR%\server-*.log" 2^>nul') do del /q "%LOG_DIR%\%%F" >nul 2>&1
	) else (
		if exist "%LOG_DIR%" rmdir /s /q "%LOG_DIR%" >nul 2>&1
	)

	set "POKETRACKER_PORT=%PORT%"
	set "POKETRACKER_SAFE_MODE=%SAFE_MODE%"
	set "POKETRACKER_HOST=%HOST%"
	set "POKETRACKER_DATA_BASE_URL=%REMOTE_DATA_BASE_URL%"
	set "POKETRACKER_REMOTE_WRITE=%REMOTE_WRITE%"

	if "%START_MINIMIZED%"=="1" (
		powershell -NoLogo -NoProfile -Command "Add-Type -Name Win -Namespace Native -MemberDefinition '[DllImport(\"kernel32.dll\")]public static extern IntPtr GetConsoleWindow();[DllImport(\"user32.dll\")]public static extern bool ShowWindow(IntPtr hWnd,int nCmdShow);'; $h=[Native.Win]::GetConsoleWindow(); [Native.Win]::ShowWindow($h,2) ^| Out-Null" >nul 2>&1
	)

	if "%AUTO_OPEN_BROWSER%"=="1" start "" "%APP_URL%"

	if /I "%CONSOLE_LOG_MODE%"=="same" (
		if "%FILE_LOG_KEEP_COUNT%"=="0" (
			%PYTHON_CMD% -u "%SCRIPT_DIR%server\server.py"
		) else (
			%PYTHON_CMD% -u "%SCRIPT_DIR%server\server.py" 2>&1 | %PYTHON_CMD% -u "%SCRIPT_DIR%server\tee_stream.py" --file "!LOG_FILE!"
		)
	) else if /I "%CONSOLE_LOG_MODE%"=="off" (
		if "%FILE_LOG_KEEP_COUNT%"=="0" (
			%PYTHON_CMD% -u "%SCRIPT_DIR%server\server.py" >nul 2>&1
		) else (
			%PYTHON_CMD% -u "%SCRIPT_DIR%server\server.py" >> "!LOG_FILE!" 2>&1
		)
	) else (
		for /f %%i in ('powershell -NoLogo -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "RUN_TS_CONSOLE=%%i"
		set "RUNTIME_CONSOLE_LOG=%TEMP%\poketracker-console-!RUN_TS_CONSOLE!.log"
		type nul > "!RUNTIME_CONSOLE_LOG!"
		if "%START_MINIMIZED%"=="1" (
			start "PokeTracker Console" /min %PYTHON_CMD% -u "%SCRIPT_DIR%server\tail_file.py" "!RUNTIME_CONSOLE_LOG!"
		) else (
			start "PokeTracker Console" %PYTHON_CMD% -u "%SCRIPT_DIR%server\tail_file.py" "!RUNTIME_CONSOLE_LOG!"
		)
		if "%FILE_LOG_KEEP_COUNT%"=="0" (
			%PYTHON_CMD% -u "%SCRIPT_DIR%server\server.py" 2>&1 | %PYTHON_CMD% -u "%SCRIPT_DIR%server\tee_stream.py" --no-stdout --file "!RUNTIME_CONSOLE_LOG!"
		) else (
			%PYTHON_CMD% -u "%SCRIPT_DIR%server\server.py" 2>&1 | %PYTHON_CMD% -u "%SCRIPT_DIR%server\tee_stream.py" --no-stdout --file "!RUNTIME_CONSOLE_LOG!" --file "!LOG_FILE!"
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
set "LAN_IP="

for /f "usebackq delims=" %%i in (`powershell -NoLogo -NoProfile -Command "$exclude='vEthernet|Hyper-V|VirtualBox|VMware|WSL|Loopback|Teredo|isatap|VPN|TAP|WireGuard|ZeroTier|Bluetooth'; $cfg = Get-NetIPConfiguration -ErrorAction SilentlyContinue ^| Where-Object { $_.NetAdapter.Status -eq 'Up' -and $_.IPv4Address -and $_.IPv4DefaultGateway -and $_.InterfaceAlias -notmatch $exclude }; $ips = $cfg ^| ForEach-Object { $_.IPv4Address.IPAddress } ^| Where-Object { $_ -match '^\d{1,3}(\.\d{1,3}){3}$' -and $_ -notmatch '^(127\.|169\.254\.)' } ^| Select-Object -Unique; $private = $ips ^| Where-Object { $_ -match '^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)' } ^| Select-Object -First 1; if ($private) { $private } elseif ($ips) { $ips[0] }" 2^>nul`) do (
	set "LAN_IP_CANDIDATE=%%i"
	echo(!LAN_IP_CANDIDATE!| findstr /r "^[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*$" >nul && (
		if /I not "!LAN_IP_CANDIDATE!"=="127.0.0.1" if /I not "!LAN_IP_CANDIDATE:~0,8!"=="169.254." (
			set "LAN_IP=!LAN_IP_CANDIDATE!"
			goto detect_lan_ip_done
		)
	)
)

for /f "usebackq delims=" %%i in (`python -c "import socket; s=socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('1.1.1.1',80)); print(s.getsockname()[0]); s.close()" 2^>nul`) do (
	set "LAN_IP_CANDIDATE=%%i"
	echo(!LAN_IP_CANDIDATE!| findstr /r "^[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*$" >nul && (
		set "LAN_IP=!LAN_IP_CANDIDATE!"
		goto detect_lan_ip_done
	)
)

for /f "tokens=2 delims=: " %%i in ('ipconfig ^| findstr /R /C:"IPv4.*:"') do (
	set "LAN_IP_CANDIDATE=%%i"
	set "LAN_IP_CANDIDATE=!LAN_IP_CANDIDATE: =!"
	echo(!LAN_IP_CANDIDATE!| findstr /r "^[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*$" >nul && (
		if /I not "!LAN_IP_CANDIDATE!"=="127.0.0.1" if /I not "!LAN_IP_CANDIDATE:~0,8!"=="169.254." (
			set "LAN_IP=!LAN_IP_CANDIDATE!"
			goto detect_lan_ip_done
		)
	)
)
:detect_lan_ip_done
if defined LAN_IP set "LAN_URL=http://%LAN_IP%:%PORT%"
exit /b 0

:try_open_firewall_port
set "FIREWALL_PORT_OPENED=0"
net session >nul 2>&1
if errorlevel 1 exit /b 0
set "FW_RULE_NAME=PokeTracker LAN %PORT%"
netsh advfirewall firewall delete rule name="%FW_RULE_NAME%" protocol=TCP localport=%PORT% >nul 2>&1
netsh advfirewall firewall add rule name="%FW_RULE_NAME%" dir=in action=allow protocol=TCP localport=%PORT% profile=private >nul 2>&1 && set "FIREWALL_PORT_OPENED=1"
exit /b 0
