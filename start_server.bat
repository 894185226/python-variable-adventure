@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title Python Variable Adventure - Setup
chcp 65001 >nul 2>&1

:: ============================================================
::  Admin check
:: ============================================================
net session >nul 2>&1
if not errorlevel 1 goto :admin_ok
    echo ==============================================
    echo   Requesting administrator privileges...
    echo   If UAC prompt appears, click [Yes]
    echo ==============================================
    powershell -Command "Start-Process '%~f0' -Verb RunAs -WorkingDirectory '%~dp0'" 2>nul
    if errorlevel 1 (
        echo [ERROR] Failed to elevate. Please run as Administrator.
        echo Right-click this file ^> [Run as administrator]
        pause
        exit /b 1
    )
    exit /b

:admin_ok
echo ==============================================
echo   Python Variable Adventure - One-Click Setup
echo ==============================================
echo(
echo This script will:
echo   1. Install Node.js ^(if needed^)
echo   2. Install npm dependencies
echo   3. Install MySQL ^(if needed^)
echo   4. Configure MySQL
echo   5. Initialize database
echo   6. Start web server at http://localhost:3000
echo ==============================================
echo(

:: ============================================================
::  Phase 1: Node.js - detect
:: ============================================================
call :detect_nodejs
if "!NODE_OK!"=="1" goto :nodejs_ready

:: not found, try winget
call :detect_winget
if "!WINGET_OK!"=="1" (
    call :install_nodejs_winget
    if "!NODE_OK!"=="1" goto :nodejs_ready
)

:: last resort: PowerShell download
call :install_nodejs_powershell
if "!NODE_OK!"=="1" goto :nodejs_ready

echo(
echo ==============================================
echo [ERROR] Failed to install Node.js!
echo ==============================================
echo(
echo Please manually install from: https://nodejs.org/
echo After install, run this script again.
echo(
pause
exit /b 1

:nodejs_ready
echo [OK] Node.js is ready
node --version
echo(

:: refresh PATH from registry
for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul ^| find "PATH"') do set "PATH=%%b;!PATH!"

:: ============================================================
::  Phase 2: npm install
:: ============================================================
echo [Phase 2/6] Installing npm dependencies...
if not exist "node_modules\" (
    call npm install 2>nul
    if errorlevel 1 (
        echo [INFO] Trying mirror registry...
        call npm install --registry=https://registry.npmmirror.com 2>nul
    )
    if errorlevel 1 (
        echo [ERROR] npm install failed!
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed
) else (
    echo [OK] Dependencies already present
)
echo(

:: ============================================================
::  Phase 3: MySQL - detect
:: ============================================================
call :detect_mysql
if "!MYSQL_OK!"=="1" goto :mysql_ready

:: not found, try winget
if "!WINGET_OK!"=="1" (
    call :install_mysql_winget
    if "!MYSQL_OK!"=="1" goto :mysql_ready
)

echo [WARN] MySQL not found and winget not available
echo [INFO] Attempting to continue without MySQL installation...
echo [INFO] server.js will create database if MySQL is running
goto :skip_mysql_install

:mysql_ready
echo [OK] MySQL is ready: !MYSQL_BIN!
echo(

:: ============================================================
::  Phase 4: MySQL - configure
:: ============================================================
call :configure_mysql

:: verify MySQL is actually accessible after configure
echo(
echo [Phase 5/6] Initializing database...
mysql -u root -e "SELECT 1" 2>nul
if not errorlevel 1 goto :db_init_ok

:: MySQL is NOT accessible — show error and exit
echo(
echo ==============================================
echo [ERROR] MySQL is installed but cannot connect!
echo ==============================================
echo(
echo MySQL was detected at: !MYSQL_BIN!
echo But the server could not be started or connected to.
echo(
echo Please try these fixes manually:
echo   1. Open Services ^(services.msc^), find MySQL, click Start
echo   2. If service won^'t start, try re-initializing:
echo      rmdir /s /q "!DATA_DIR!"
echo      Then run this script again.
echo   3. If root password is not empty, edit server.js
echo      and update the 'password' field.
echo(
echo Press any key to exit...
pause >nul
exit /b 1

:db_init_ok
:: MySQL is accessible — initialize database
mysql -u root -e "CREATE DATABASE IF NOT EXISTS python_var_lesson CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul
if exist "database.sql" (
    mysql -u root python_var_lesson < database.sql 2>nul
    echo [OK] Database schema imported
)
echo [OK] Database ready
goto :start_server

:skip_mysql_install
echo(

:: ============================================================
::  Phase 5: Database init (MySQL may not be available)
:: ============================================================
echo [Phase 5/6] Initializing database...
mysql -u root -e "SELECT 1" 2>nul
if not errorlevel 1 (
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS python_var_lesson CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul
    if exist "database.sql" (
        mysql -u root python_var_lesson < database.sql 2>nul
    )
    echo [OK] Database ready
    goto :start_server
)

:: MySQL not accessible and not installed — warn but try server.js anyway
echo [WARN] MySQL not accessible
echo [INFO] server.js will create database on startup if MySQL is running
echo(
echo Note: The website requires MySQL to function.
echo If MySQL is not running, the website will show an error.
echo(

:start_server
:: ============================================================
::  Phase 6: Start server
:: ============================================================
echo [Phase 6/6] Starting web server...

:: check port 3000
netstat -ano 2>nul | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [INFO] Port 3000 is in use, attempting to free...
    for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do (
        taskkill /f /pid %%p >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
    echo [OK] Port 3000 freed
)
echo(
echo   Website: http://localhost:3000
echo   Press Ctrl+C to stop the server
echo   ^(Browser will open automatically^)
echo(
echo ==============================================
echo(

:: auto-open browser
start "" /B cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

node server.js

echo(
echo [Server stopped] Exit code: !errorlevel!
echo(
pause
exit /b

:: ============================================================
::   SUBROUTINES
:: ============================================================

:: ---- detect_nodejs ----
:detect_nodejs
echo [Phase 1/6] Checking Node.js...
set "NODE_OK=0"

where node >nul 2>&1
if not errorlevel 1 (
    set "NODE_OK=1"
    echo [OK] Node.js found in PATH
    exit /b
)

node --version >nul 2>&1
if not errorlevel 1 (
    set "NODE_OK=1"
    echo [OK] Node.js found
    exit /b
)

:: search common directories
for %%d in (
    "C:\Program Files\nodejs"
    "C:\Program Files (x86)\nodejs"
    "%ProgramFiles%\nodejs"
) do (
    if exist "%%~d\node.exe" (
        set "PATH=%%~d;!PATH!"
        set "NODE_OK=1"
        echo [OK] Found at: %%~d
        exit /b
    )
)

if "!NODE_OK!"=="0" echo [INFO] Node.js not found
exit /b

:: ---- detect_winget ----
:detect_winget
set "WINGET_OK=0"

where winget >nul 2>&1
if not errorlevel 1 (
    set "WINGET_OK=1"
    exit /b
)

if exist "%LOCALAPPDATA%\Microsoft\WindowsApps\winget.exe" (
    set "WINGET_OK=1"
    set "PATH=%LOCALAPPDATA%\Microsoft\WindowsApps;!PATH!"
    exit /b
)

:: search user profiles (for admin context)
for /d %%u in ("C:\Users\*") do (
    if exist "%%u\AppData\Local\Microsoft\WindowsApps\winget.exe" (
        set "WINGET_OK=1"
        set "PATH=%%u\AppData\Local\Microsoft\WindowsApps;!PATH!"
        exit /b
    )
)
exit /b

:: ---- install_nodejs_winget ----
:install_nodejs_winget
echo [INFO] Installing Node.js via winget...
winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements 2>&1
if errorlevel 1 (
    winget install OpenJS.NodeJS --accept-package-agreements --accept-source-agreements 2>&1
)

timeout /t 5 /nobreak >nul

:: refresh PATH
for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul ^| find "PATH"') do set "PATH=%%b;!PATH!"

:: search again
for %%d in (
    "C:\Program Files\nodejs"
    "C:\Program Files (x86)\nodejs"
    "%ProgramFiles%\nodejs"
) do (
    if exist "%%~d\node.exe" (
        set "PATH=%%~d;!PATH!"
        set "NODE_OK=1"
        echo [OK] Installed at: %%~d
        exit /b
    )
)
echo [WARN] winget install completed but Node.js not found
exit /b

:: ---- install_nodejs_powershell ----
:install_nodejs_powershell
echo [INFO] Downloading Node.js via PowerShell...
set "INSTALLER=%TEMP%\nodejs_installer.msi"

(
    echo [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    echo $path = [System.IO.Path]::GetTempPath() + 'nodejs_installer.msi'
    echo Write-Host 'Downloading Node.js...'
    echo try {
    echo     Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' -OutFile $path -ErrorAction Stop
    echo     Write-Host 'Installing...'
    echo     Start-Process msiexec.exe -ArgumentList '/i', $path, '/quiet', '/norestart' -Wait
    echo     Write-Host 'Done'
    echo } catch {
    echo     Write-Host ('FAILED: ' + $_.Exception.Message)
    echo     exit 1
    echo }
) > "%TEMP%\install_nodejs.ps1"

powershell -ExecutionPolicy Bypass -File "%TEMP%\install_nodejs.ps1" 2>&1
del "%TEMP%\install_nodejs.ps1" 2>nul

:: search
for %%d in (
    "C:\Program Files\nodejs"
    "C:\Program Files (x86)\nodejs"
) do (
    if exist "%%~d\node.exe" (
        set "PATH=%%~d;!PATH!"
        set "NODE_OK=1"
        echo [OK] Installed at: %%~d
        exit /b
    )
)

if exist "!INSTALLER!" del "!INSTALLER!" 2>nul
exit /b

:: ---- detect_mysql ----
:detect_mysql
echo [Phase 3/6] Checking MySQL...
set "MYSQL_OK=0"
set "MYSQL_BIN="
set "MYSQLD="

where mysql >nul 2>&1
if not errorlevel 1 (
    for /f "delims=" %%i in ('where mysql 2^>nul') do (
        set "MYSQL_BIN=%%~dpi"
        set "MYSQL_OK=1"
        echo [OK] MySQL found in PATH: %%~dpi
        exit /b
    )
)

:: search common dirs
for %%d in (
    "C:\Program Files\MySQL\MySQL Server 9.7\bin"
    "C:\Program Files\MySQL\MySQL Server 9.0\bin"
    "C:\Program Files\MySQL\MySQL Server 8.4\bin"
    "C:\Program Files\MySQL\MySQL Server 8.0\bin"
    "C:\Program Files\MySQL\MySQL Server 5.7\bin"
    "C:\Program Files (x86)\MySQL\MySQL Server 8.0\bin"
    "C:\Program Files (x86)\MySQL\MySQL Server 5.7\bin"
) do (
    if exist "%%~d\mysql.exe" (
        set "PATH=%%~d;!PATH!"
        set "MYSQL_OK=1"
        set "MYSQL_BIN=%%~d\"
        echo [OK] Found at: %%~d
        exit /b
    )
)

echo [INFO] MySQL not found
exit /b

:: ---- install_mysql_winget ----
:install_mysql_winget
echo [INFO] Installing MySQL via winget...
winget install Oracle.MySQL --accept-package-agreements --accept-source-agreements 2>&1

timeout /t 5 /nobreak >nul

for %%d in (
    "C:\Program Files\MySQL\MySQL Server 9.7\bin"
    "C:\Program Files\MySQL\MySQL Server 9.0\bin"
    "C:\Program Files\MySQL\MySQL Server 8.4\bin"
    "C:\Program Files\MySQL\MySQL Server 8.0\bin"
    "C:\Program Files\MySQL\MySQL Server 5.7\bin"
    "C:\Program Files (x86)\MySQL\MySQL Server 8.0\bin"
) do (
    if exist "%%~d\mysql.exe" (
        set "PATH=%%~d;!PATH!"
        set "MYSQL_OK=1"
        set "MYSQL_BIN=%%~d\"
        echo [OK] Installed at: %%~d
        exit /b
    )
)
echo [WARN] winget install completed but MySQL not found
exit /b

:: ---- configure_mysql ----
:configure_mysql
echo [Phase 4/6] Configuring MySQL...

:: find mysqld
set "MYSQLD="
if defined MYSQL_BIN (
    if exist "!MYSQL_BIN!mysqld.exe" set "MYSQLD=!MYSQL_BIN!mysqld.exe"
)
if not defined MYSQLD (
    for %%i in (mysqld.exe) do if exist "%%~$PATH:i" set "MYSQLD=%%~$PATH:i"
)

if not defined MYSQLD (
    echo [WARN] mysqld.exe not found, cannot configure MySQL
    exit /b
)

echo [INFO] mysqld found: !MYSQLD!

:: detect data dir — search ProgramData for existing data, then fallback
set "DATA_DIR="
for /d %%d in ("C:\ProgramData\MySQL\MySQL Server *") do (
    if exist "%%d\Data\mysql\" if not defined DATA_DIR set "DATA_DIR=%%d\Data"
)
:: fallback: derive from mysqld path (for portable installs)
if not defined DATA_DIR (
    for %%b in ("!MYSQLD!\..") do set "DATA_DIR=%%~fb\data"
)

echo [INFO] Data dir: !DATA_DIR!

:: initialize if needed
if not exist "!DATA_DIR!\mysql\" (
    echo [INFO] Data directory not initialized, running --initialize-insecure...
    echo [INFO] This may take 30-60 seconds...
    if not exist "!DATA_DIR!" mkdir "!DATA_DIR!" 2>nul
    "!MYSQLD!" --initialize-insecure --datadir="!DATA_DIR!" --console 2>&1
    if errorlevel 1 (
        echo [WARN] Initialization with --datadir failed, retrying default...
        "!MYSQLD!" --initialize-insecure --console 2>&1
    )
    if not exist "!DATA_DIR!\mysql\" (
        echo [WARN] Data directory still not found after init attempt
    ) else (
        echo [OK] Data directory initialized
    )
)

:: detect/create service — dynamic discovery first, then fallback
set "SVC_NAME="
for /f "tokens=2" %%a in ('sc query state^= all 2^>nul ^| findstr /i "SERVICE_NAME.*mysql"') do (
    if not defined SVC_NAME set "SVC_NAME=%%a"
)
if not defined SVC_NAME (
    for %%s in (MySQL97 MySQL90 MySQL84 MySQL80 MySQL MySQL57) do (
        sc query "%%s" >nul 2>&1
        if not errorlevel 1 if not defined SVC_NAME set "SVC_NAME=%%s"
    )
)

if not defined SVC_NAME (
    echo [INFO] No MySQL service found, creating...
    if defined MYSQLD (
        if exist "!MYSQLD!\..\my.ini" (
            "!MYSQLD!" --install MySQL80 --defaults-file="!MYSQLD!\..\my.ini" >nul 2>&1
        ) else (
            "!MYSQLD!" --install MySQL80 >nul 2>&1
        )
        if errorlevel 1 (
            echo [WARN] Service creation failed (may need to run as Administrator)
        ) else (
            echo [OK] MySQL80 service created
        )
        for %%s in (MySQL80 MySQL MySQL84 MySQL90 MySQL97 MySQL57) do (
            sc query "%%s" >nul 2>&1
            if not errorlevel 1 if not defined SVC_NAME set "SVC_NAME=%%s"
        )
    )
)

if defined SVC_NAME (
    echo [INFO] MySQL service: !SVC_NAME!
    sc query "!SVC_NAME!" 2>nul | findstr "STATE" 2>nul
) else (
    echo [INFO] No service, will use direct mysqld start
)

:: ===== start MySQL =====
echo [INFO] Starting MySQL...

set "CONNECTED=0"
mysql -u root -e "SELECT 1" 2>nul
if not errorlevel 1 (
    set "CONNECTED=1"
    echo [OK] MySQL is already running and accessible
    exit /b
)

:: 1) try service start
if "!CONNECTED!"=="0" if defined SVC_NAME (
    echo [INFO] Starting service !SVC_NAME!...
    net start "!SVC_NAME!" 2>&1
    echo [INFO] Waiting for MySQL to be ready ^(up to 30s^)...
    for /l %%w in (1,1,30) do (
        if "!CONNECTED!"=="0" (
            timeout /t 1 /nobreak >nul
            mysql -u root -e "SELECT 1" 2>nul
            if not errorlevel 1 (
                set "CONNECTED=1"
                echo [OK] MySQL service started successfully
            )
        )
    )
)

:: 2) try direct mysqld start (with error output capture)
if "!CONNECTED!"=="0" if defined MYSQLD (
    echo [INFO] Trying direct mysqld start...
    echo [INFO] Command: "!MYSQLD!" --console --datadir="!DATA_DIR!"
    
    :: start mysqld and capture its output to a temp file
    start "" /B "!MYSQLD!" --console --datadir="!DATA_DIR!" > "%TEMP%\mysqld_output.log" 2>&1
    
    echo [INFO] Waiting for MySQL to accept connections ^(up to 30s^)...
    for /l %%w in (1,1,15) do (
        if "!CONNECTED!"=="0" (
            timeout /t 2 /nobreak >nul
            mysql -u root -e "SELECT 1" 2>nul
            if not errorlevel 1 (
                set "CONNECTED=1"
                echo [OK] MySQL started directly
            )
        )
    )
    
    :: if still not connected, check if mysqld is still running
    if "!CONNECTED!"=="0" (
        tasklist /fi "imagename eq mysqld.exe" 2>nul | find "mysqld.exe" >nul 2>&1
        if errorlevel 1 (
            echo [ERROR] mysqld.exe exited immediately!
            echo [INFO] Last mysqld output:
            if exist "%TEMP%\mysqld_output.log" (
                type "%TEMP%\mysqld_output.log" 2>nul
                del "%TEMP%\mysqld_output.log" 2>nul
            )
            echo(
            echo Common causes:
            echo   1. Data directory already initialized by a different MySQL version
            echo   2. Port 3306 already in use
            echo   3. Insufficient permissions for data directory
            echo(
            echo Fix: Try deleting the data directory and re-initializing:
            echo   rmdir /s /q "!DATA_DIR!"
            echo   Then run this script again.
            echo(
        )
    )
)

:: 3) try password reset (skip-grant-tables mode)
if "!CONNECTED!"=="0" if defined MYSQLD (
    echo [INFO] Attempting password reset via safe mode...
    
    :: stop any running instances
    if defined SVC_NAME net stop "!SVC_NAME!" >nul 2>&1
    taskkill /f /im mysqld.exe >nul 2>&1
    timeout /t 2 /nobreak >nul

    echo [INFO] Starting MySQL in safe mode ^(skip-grant-tables^)...
    start "" /B "!MYSQLD!" --console --skip-grant-tables --skip-networking --datadir="!DATA_DIR!"
    timeout /t 5 /nobreak >nul

    mysql -u root -e "FLUSH PRIVILEGES;" 2>nul
    mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '';" 2>nul
    if errorlevel 1 mysql -u root -e "SET PASSWORD FOR 'root'@'localhost' = PASSWORD('');" 2>nul
    if errorlevel 1 mysql -u root -e "UPDATE mysql.user SET authentication_string=PASSWORD('') WHERE User='root'; FLUSH PRIVILEGES;" 2>nul

    echo [OK] Root password reset attempted

    :: restart MySQL normally
    taskkill /f /im mysqld.exe >nul 2>&1
    timeout /t 2 /nobreak >nul

    if defined SVC_NAME (
        net start "!SVC_NAME!" >nul 2>&1
    ) else (
        start "" /B "!MYSQLD!" --console --datadir="!DATA_DIR!"
    )

    for /l %%w in (1,1,15) do (
        if "!CONNECTED!"=="0" (
            timeout /t 2 /nobreak >nul
            mysql -u root -e "SELECT 1" 2>nul
            if not errorlevel 1 (
                set "CONNECTED=1"
                echo [OK] MySQL reconnected with empty password
            )
        )
    )
)

if "!CONNECTED!"=="1" (
    echo [OK] MySQL connection verified!
) else (
    echo [WARN] All startup attempts failed. MySQL is not running.
)
:: clean up temp files
if exist "%TEMP%\mysqld_output.log" del "%TEMP%\mysqld_output.log" 2>nul
exit /b