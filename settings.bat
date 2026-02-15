@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 > nul
mode con cols=240 lines=50 >nul 2>&1

set "SCRIPT_DIR=%~dp0"
set "CONFIG_FILE=%SCRIPT_DIR%run.config.bat"
set "DEFAULTS_FILE=%SCRIPT_DIR%run.defaults.bat"
set "PROFILE_DIR=%SCRIPT_DIR%profiles\run"

set "USE_COLOR=0"
if defined WT_SESSION set "USE_COLOR=1"
if /I "%TERM_PROGRAM%"=="vscode" set "USE_COLOR=1"
if "%USE_COLOR%"=="1" (
  for /f %%e in ('echo prompt $E^| cmd') do set "ESC=%%e"
) else (
  set "ESC="
)
set "COLOR_OK="
set "COLOR_RST="
if defined ESC (
  set "COLOR_OK=!ESC![92m"
  set "COLOR_RST=!ESC![0m"
)

call :set_defaults
if exist "%DEFAULTS_FILE%" call "%DEFAULTS_FILE%"
set "ACTIVE_PROFILE=(manual/defaults)"

if not exist "%PROFILE_DIR%" mkdir "%PROFILE_DIR%" >nul 2>&1
if exist "%CONFIG_FILE%" call "%CONFIG_FILE%"
call :validate_settings

:menu
cls
call :print_settings_banner
set "AUTO_OPEN_BROWSER_TEXT=false"
if "%AUTO_OPEN_BROWSER%"=="1" set "AUTO_OPEN_BROWSER_TEXT=true"
set "START_MINIMIZED_TEXT=false"
if "%START_MINIMIZED%"=="1" set "START_MINIMIZED_TEXT=true"
set "SAFE_MODE_TEXT=false"
if "%SAFE_MODE%"=="1" set "SAFE_MODE_TEXT=true"
echo   Current settings:
echo     CONSOLE_LOG_MODE     = %CONSOLE_LOG_MODE%
echo     FILE_LOG_KEEP_COUNT  = %FILE_LOG_KEEP_COUNT%
echo     AUTO_OPEN_BROWSER    = %AUTO_OPEN_BROWSER_TEXT%
echo     START_MINIMIZED      = %START_MINIMIZED_TEXT%
echo     PORT                 = %PORT%
echo     SAFE_MODE            = %SAFE_MODE_TEXT%
echo     HOST                 = %HOST%
echo     STARTUP_SUMMARY_MODE = %STARTUP_SUMMARY_MODE%
echo     ACTIVE_PROFILE       = %ACTIVE_PROFILE%
echo.
echo   1^) Console log mode ^(same^/separate/off^)
echo   2^) File logs keep count ^(0 = disabled, N = keep last N files^)
echo   3^) AUTO_OPEN_BROWSER ^(true/false^)
echo   4^) START_MINIMIZED ^(true/false^)
echo   5^) Set PORT manually ^(1..65535^)
echo   6^) SAFE_MODE ^(true/false, read-only saves^)
echo   7^) Profiles ^(save/load presets^)
echo   8^) Host and startup summary settings
echo.
echo   9^) Save and exit
echo   0^) Exit without saving
echo.
set /p "choice=Select option: "

if "%choice%"=="1" goto console_mode_menu
if "%choice%"=="2" goto set_file_keep_count
if "%choice%"=="3" goto auto_open_browser_menu
if "%choice%"=="4" goto start_minimized_menu
if "%choice%"=="5" set "ACTIVE_PROFILE=(manual/defaults)" & goto set_port
if "%choice%"=="6" goto safe_mode_menu
if "%choice%"=="7" goto profiles_menu
if "%choice%"=="8" goto host_summary_menu
if "%choice%"=="9" goto save
if "%choice%"=="0" goto end
goto menu

:host_summary_menu
cls
echo.
echo   Host and startup summary:
echo   1^) Host mode ^(localhost / 0.0.0.0^)
echo   2^) Startup summary ^(full / compact / off^)
echo   3^) Reset all settings to defaults
echo   0^) Back
echo.
set /p "hsChoice=Select option: "
if "%hsChoice%"=="1" goto host_mode_menu
if "%hsChoice%"=="2" goto summary_mode_menu
if "%hsChoice%"=="3" goto reset_defaults
if "%hsChoice%"=="0" goto menu
goto host_summary_menu

:host_mode_menu
cls
echo.
echo   Host mode:
set "hostLocalMark="
set "hostLanMark="
if /I "%HOST%"=="localhost" set "hostLocalMark=!COLOR_OK![current]!COLOR_RST!"
if /I "%HOST%"=="0.0.0.0" set "hostLanMark=!COLOR_OK![current]!COLOR_RST!"
echo   1^) localhost ^(only this PC^) !hostLocalMark!
echo   2^) 0.0.0.0 ^(LAN access from other devices^) !hostLanMark!
echo   0^) Back
echo.
set /p "hostChoice=Select option: "
if "%hostChoice%"=="1" set "HOST=localhost" & set "ACTIVE_PROFILE=(manual/defaults)" & goto host_summary_menu
if "%hostChoice%"=="2" set "HOST=0.0.0.0" & set "ACTIVE_PROFILE=(manual/defaults)" & goto host_summary_menu
if "%hostChoice%"=="0" goto host_summary_menu
goto host_mode_menu

:summary_mode_menu
cls
echo.
echo   Startup summary mode:
set "summaryFullMark="
set "summaryCompactMark="
set "summaryOffMark="
if /I "%STARTUP_SUMMARY_MODE%"=="full" set "summaryFullMark=!COLOR_OK![current]!COLOR_RST!"
if /I "%STARTUP_SUMMARY_MODE%"=="compact" set "summaryCompactMark=!COLOR_OK![current]!COLOR_RST!"
if /I "%STARTUP_SUMMARY_MODE%"=="off" set "summaryOffMark=!COLOR_OK![current]!COLOR_RST!"
echo   1^) full !summaryFullMark!
echo   2^) compact !summaryCompactMark!
echo   3^) off !summaryOffMark!
echo   0^) Back
echo.
set /p "summaryChoice=Select option: "
if "%summaryChoice%"=="1" set "STARTUP_SUMMARY_MODE=full" & set "ACTIVE_PROFILE=(manual/defaults)" & goto host_summary_menu
if "%summaryChoice%"=="2" set "STARTUP_SUMMARY_MODE=compact" & set "ACTIVE_PROFILE=(manual/defaults)" & goto host_summary_menu
if "%summaryChoice%"=="3" set "STARTUP_SUMMARY_MODE=off" & set "ACTIVE_PROFILE=(manual/defaults)" & goto host_summary_menu
if "%summaryChoice%"=="0" goto host_summary_menu
goto summary_mode_menu

:console_mode_menu
cls
echo.
echo   Console log mode:
set "sameMark="
set "separateMark="
set "offMark="
if /I "%CONSOLE_LOG_MODE%"=="same" set "sameMark=!COLOR_OK![current]!COLOR_RST!"
if /I "%CONSOLE_LOG_MODE%"=="separate" set "separateMark=!COLOR_OK![current]!COLOR_RST!"
if /I "%CONSOLE_LOG_MODE%"=="off" set "offMark=!COLOR_OK![current]!COLOR_RST!"
echo   1^) same      - logs in current window !sameMark!
echo   2^) separate  - logs in separate window !separateMark!
echo   3^) off       - no console logs !offMark!
echo   0^) Back
echo.
set /p "consoleChoice=Select option: "
if "%consoleChoice%"=="1" set "CONSOLE_LOG_MODE=same" & set "ACTIVE_PROFILE=(manual/defaults)" & goto menu
if "%consoleChoice%"=="2" set "CONSOLE_LOG_MODE=separate" & set "ACTIVE_PROFILE=(manual/defaults)" & goto menu
if "%consoleChoice%"=="3" set "CONSOLE_LOG_MODE=off" & set "ACTIVE_PROFILE=(manual/defaults)" & goto menu
if "%consoleChoice%"=="0" goto menu
goto console_mode_menu

:set_file_keep_count
echo.
echo Enter FILE_LOG_KEEP_COUNT value:
echo   0  = disable file logs
echo   N  = keep last N log files in data/logs
set /p "newKeep=Value: "
if "%newKeep%"=="" goto menu
echo(%newKeep%| findstr /r "^[0-9][0-9]*$" >nul
if errorlevel 1 (
  echo Invalid number.
  timeout /t 2 >nul
  goto menu
)
set "FILE_LOG_KEEP_COUNT=%newKeep%"
set "ACTIVE_PROFILE=(manual/defaults)"
goto menu

:auto_open_browser_menu
cls
echo.
echo   AUTO_OPEN_BROWSER:
set "aobTrueMark="
set "aobFalseMark="
if "%AUTO_OPEN_BROWSER%"=="1" set "aobTrueMark=!COLOR_OK![current]!COLOR_RST!"
if "%AUTO_OPEN_BROWSER%"=="0" set "aobFalseMark=!COLOR_OK![current]!COLOR_RST!"
echo   1^) true  - open browser automatically !aobTrueMark!
echo   2^) false - do not open browser !aobFalseMark!
echo   0^) Back
echo.
set /p "aobChoice=Select option: "
if "%aobChoice%"=="1" set "AUTO_OPEN_BROWSER=1" & set "ACTIVE_PROFILE=(manual/defaults)" & goto menu
if "%aobChoice%"=="2" set "AUTO_OPEN_BROWSER=0" & set "ACTIVE_PROFILE=(manual/defaults)" & goto menu
if "%aobChoice%"=="0" goto menu
goto auto_open_browser_menu

:start_minimized_menu
cls
echo.
echo   START_MINIMIZED:
set "smTrueMark="
set "smFalseMark="
if "%START_MINIMIZED%"=="1" set "smTrueMark=!COLOR_OK![current]!COLOR_RST!"
if "%START_MINIMIZED%"=="0" set "smFalseMark=!COLOR_OK![current]!COLOR_RST!"
echo   1^) true  - start minimized !smTrueMark!
echo   2^) false - start normally !smFalseMark!
echo   0^) Back
echo.
set /p "smChoice=Select option: "
if "%smChoice%"=="1" set "START_MINIMIZED=1" & set "ACTIVE_PROFILE=(manual/defaults)" & goto menu
if "%smChoice%"=="2" set "START_MINIMIZED=0" & set "ACTIVE_PROFILE=(manual/defaults)" & goto menu
if "%smChoice%"=="0" goto menu
goto start_minimized_menu

:set_port
echo.
echo Enter server PORT in range 1..65535
set /p "newPort=PORT: "
if "%newPort%"=="" goto menu
echo(%newPort%| findstr /r "^[0-9][0-9]*$" >nul
if errorlevel 1 (
  echo Invalid port.
  timeout /t 2 >nul
  goto menu
)
set /a PORT_CHECK=%newPort% >nul 2>&1
if %PORT_CHECK% LSS 1 (
  echo Port must be >= 1.
  timeout /t 2 >nul
  goto menu
)
if %PORT_CHECK% GTR 65535 (
  echo Port must be <= 65535.
  timeout /t 2 >nul
  goto menu
)
set "PORT=%newPort%"
goto menu

:safe_mode_menu
cls
echo.
echo   SAFE_MODE:
set "safeTrueMark="
set "safeFalseMark="
if "%SAFE_MODE%"=="1" set "safeTrueMark=!COLOR_OK![current]!COLOR_RST!"
if "%SAFE_MODE%"=="0" set "safeFalseMark=!COLOR_OK![current]!COLOR_RST!"
echo   1^) true  - read-only saves enabled !safeTrueMark!
echo   2^) false - saves allowed !safeFalseMark!
echo   0^) Back
echo.
set /p "safeChoice=Select option: "
if "%safeChoice%"=="1" set "SAFE_MODE=1" & set "ACTIVE_PROFILE=(manual/defaults)" & goto menu
if "%safeChoice%"=="2" set "SAFE_MODE=0" & set "ACTIVE_PROFILE=(manual/defaults)" & goto menu
if "%safeChoice%"=="0" goto menu
goto safe_mode_menu

:profiles_menu
cls
echo.
echo   Profiles:
echo   1^) Save current settings as profile
echo   2^) Load profile into current settings
echo   3^) Show profile list
echo   4^) Delete profile
echo   0^) Back
echo.
echo   Active profile in session: %ACTIVE_PROFILE%
echo.
set /p "profileChoice=Select option: "
if "%profileChoice%"=="1" goto profile_save
if "%profileChoice%"=="2" goto profile_load
if "%profileChoice%"=="3" goto profile_list
if "%profileChoice%"=="4" goto profile_delete
if "%profileChoice%"=="0" goto menu
goto profiles_menu

:profile_save
echo.
set /p "PROFILE_NAME=Profile name: "
if "%PROFILE_NAME%"=="" goto profiles_menu
set "PROFILE_NAME=%PROFILE_NAME:\=_%"
set "PROFILE_NAME=%PROFILE_NAME:/=_%"
set "PROFILE_NAME=%PROFILE_NAME::=_%"
set "PROFILE_NAME=%PROFILE_NAME:*=_%"
set "PROFILE_NAME=%PROFILE_NAME:?=_%"
set "PROFILE_NAME=%PROFILE_NAME:"=_%"
set "PROFILE_NAME=%PROFILE_NAME:<=_%"
set "PROFILE_NAME=%PROFILE_NAME:>=_%"
set "PROFILE_NAME=%PROFILE_NAME:|=_%"
set "PROFILE_FILE=%PROFILE_DIR%\%PROFILE_NAME%.bat"
call :write_config "%PROFILE_FILE%"
echo Profile saved: %PROFILE_NAME%
timeout /t 2 >nul
goto profiles_menu

:profile_load
echo.
set /p "PROFILE_NAME=Profile name to load: "
if "%PROFILE_NAME%"=="" goto profiles_menu
set "PROFILE_FILE=%PROFILE_DIR%\%PROFILE_NAME%.bat"
if not exist "%PROFILE_FILE%" (
  echo Profile not found.
  timeout /t 2 >nul
  goto profiles_menu
)
call "%PROFILE_FILE%"
call :validate_settings
set "ACTIVE_PROFILE=%PROFILE_NAME%"
echo Profile loaded: %PROFILE_NAME%
timeout /t 2 >nul
goto profiles_menu

:profile_list
echo.
echo Available profiles:
dir /b "%PROFILE_DIR%\*.bat" 2>nul
echo.
pause
goto profiles_menu

:profile_delete
echo.
set /p "PROFILE_NAME=Profile name to delete: "
if "%PROFILE_NAME%"=="" goto profiles_menu
set "PROFILE_FILE=%PROFILE_DIR%\%PROFILE_NAME%.bat"
if not exist "%PROFILE_FILE%" (
  echo Profile not found.
  timeout /t 2 >nul
  goto profiles_menu
)
del /q "%PROFILE_FILE%" >nul 2>&1
echo Profile deleted: %PROFILE_NAME%
if /I "%ACTIVE_PROFILE%"=="%PROFILE_NAME%" set "ACTIVE_PROFILE=(manual/defaults)"
timeout /t 2 >nul
goto profiles_menu

:reset_defaults
call :set_defaults
if exist "%DEFAULTS_FILE%" call "%DEFAULTS_FILE%"
call :validate_settings
set "ACTIVE_PROFILE=(manual/defaults)"
goto menu

:save
call :write_config "%CONFIG_FILE%"
echo.
echo Settings saved to run.config.bat
echo.
:end
exit /b 0

:print_settings_banner
echo.
echo.
if exist "%SCRIPT_DIR%banners\settings-banner.txt" (
  type "%SCRIPT_DIR%banners\settings-banner.txt"
) else (
  echo   ========================================
  echo   PokeTracker - Run settings
  echo   ========================================
)
echo.
exit /b 0

:set_defaults
set "PORT=1025"
set "HOST=localhost"
set "AUTO_OPEN_BROWSER=1"
set "START_MINIMIZED=0"
set "SAFE_MODE=0"
set "STARTUP_SUMMARY_MODE=full"
set "CONSOLE_LOG_MODE=same"
set "FILE_LOG_KEEP_COUNT=0"
exit /b 0

:validate_settings
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
exit /b 0

:write_config
> "%~1" (
  echo @echo off
  echo set "PORT=%PORT%"
  echo set "HOST=%HOST%"
  echo set "AUTO_OPEN_BROWSER=%AUTO_OPEN_BROWSER%"
  echo set "START_MINIMIZED=%START_MINIMIZED%"
  echo set "SAFE_MODE=%SAFE_MODE%"
  echo set "STARTUP_SUMMARY_MODE=%STARTUP_SUMMARY_MODE%"
  echo set "CONSOLE_LOG_MODE=%CONSOLE_LOG_MODE%"
  echo set "FILE_LOG_KEEP_COUNT=%FILE_LOG_KEEP_COUNT%"
)
exit /b 0
