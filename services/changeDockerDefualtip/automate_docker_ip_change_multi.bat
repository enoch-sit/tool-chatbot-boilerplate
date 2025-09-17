@echo off
REM Interactive script to change Docker IP on multiple servers
REM Usage: automate_docker_ip_change_multi.bat

setlocal enabledelayedexpansion

set SCRIPT_NAME=universal_docker_ip_change_script.sh
set REMOTE_SCRIPT_PATH=/tmp/%SCRIPT_NAME%
set LOCAL_SCRIPT_PATH=%~dp0%SCRIPT_NAME%

echo ========================================
echo Multi-Server Docker IP Change Script
echo ========================================
echo This script will help you change Docker IP on multiple servers
echo Target IP range: 10.20.0.0/24
echo ========================================

REM Check if PuTTY tools are available
where plink >nul 2>&1
if errorlevel 1 (
    echo ERROR: plink.exe not found in PATH. Please install PuTTY tools.
    pause
    exit /b 1
)

where pscp >nul 2>&1
if errorlevel 1 (
    echo ERROR: pscp.exe not found in PATH. Please install PuTTY tools.
    pause
    exit /b 1
)

REM Check if local script file exists
if not exist "%LOCAL_SCRIPT_PATH%" (
    echo ERROR: Local script file not found: %LOCAL_SCRIPT_PATH%
    echo Please ensure the universal_docker_ip_change_script.sh file is in the same directory.
    pause
    exit /b 1
)

:server_loop
echo.
echo ========================================
echo Enter server details (or 'quit' to exit)
echo ========================================

set /p HOST="Enter hostname (e.g., proj04@project-1-04.eduhk.hk): "

if /i "%HOST%"=="quit" (
    echo Exiting script. Goodbye!
    pause
    exit /b 0
)

if "%HOST%"=="" (
    echo ERROR: Hostname cannot be empty. Try again.
    goto server_loop
)

set /p PASSWORD="Enter password for %HOST%: "

if "%PASSWORD%"=="" (
    echo ERROR: Password cannot be empty. Try again.
    goto server_loop
)

REM Ask if sudo password is different
set /p SUDO_DIFFERENT="Is sudo password different from SSH password? (y/n): "
if /i "%SUDO_DIFFERENT%"=="y" (
    set /p SUDO_PASSWORD="Enter sudo password: "
    if "!SUDO_PASSWORD!"=="" (
        echo ERROR: Sudo password cannot be empty. Try again.
        goto server_loop
    )
) else (
    set SUDO_PASSWORD=%PASSWORD%
)

echo.
echo ========================================
echo Processing server: %HOST%
echo ========================================

echo Step 1: Testing SSH connection...
plink -ssh -pw %PASSWORD% %HOST% "echo 'SSH connection successful'"
if errorlevel 1 (
    echo ERROR: Failed to connect via SSH to %HOST%
    echo Please check credentials and network.
    echo.
    set /p RETRY="Try again with different credentials? (y/n): "
    if /i "!RETRY!"=="y" (
        goto server_loop
    ) else (
        goto next_server
    )
)

echo Step 2: Transferring script to remote server...
pscp -pw %PASSWORD% "%LOCAL_SCRIPT_PATH%" %HOST%:%REMOTE_SCRIPT_PATH%
if errorlevel 1 (
    echo ERROR: Failed to transfer script file to %HOST%
    goto next_server
)

echo Step 3: Making script executable...
plink -ssh -pw %PASSWORD% %HOST% "chmod +x %REMOTE_SCRIPT_PATH%"
if errorlevel 1 (
    echo ERROR: Failed to make script executable on %HOST%
    goto next_server
)

echo Step 4: Executing Docker IP change script...
echo Note: This will require sudo privileges and may take a few minutes...
plink -ssh -pw %PASSWORD% %HOST% "echo '%SUDO_PASSWORD%' | sudo -S %REMOTE_SCRIPT_PATH%"
if errorlevel 1 (
    echo ERROR: Script execution failed on %HOST%
    echo This might be due to incorrect sudo password or Docker issues.
    echo You can try running manually: ssh %HOST% "sudo %REMOTE_SCRIPT_PATH%"
    goto cleanup_and_next
)

echo Step 5: Cleaning up temporary files...
plink -ssh -pw %PASSWORD% %HOST% "rm -f %REMOTE_SCRIPT_PATH%"

echo.
echo ========================================
echo SUCCESS: Docker IP change completed on %HOST%!
echo ========================================
echo Docker should now be using 10.20.0.0/24 IP range on %HOST%
echo ========================================

goto next_server

:cleanup_and_next
echo Cleaning up temporary files on %HOST%...
plink -ssh -pw %PASSWORD% %HOST% "rm -f %REMOTE_SCRIPT_PATH%" 2>nul

:next_server
echo.
set /p CONTINUE="Process another server? (y/n): "
if /i "%CONTINUE%"=="y" (
    goto server_loop
)

echo.
echo ========================================
echo Multi-Server Docker IP Change Complete!
echo ========================================
echo Summary:
echo - All specified servers have been processed
echo - Docker IP range changed to 10.20.0.0/24 where successful
echo - Failed servers may need manual intervention
echo.
echo To verify changes, run: check_docker_ip.bat [hostname] [password]
echo ========================================

pause
