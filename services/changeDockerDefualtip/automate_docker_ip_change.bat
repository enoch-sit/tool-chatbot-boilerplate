@echo off
REM Improved script to automate SSH into remote server and execute Docker IP change script
REM Prerequisites:
REM - PuTTY tools (plink.exe, pscp.exe) must be installed and in PATH
REM - SSH access to the remote server
REM Usage: automate_docker_ip_change.bat [hostname] [username] [password]

setlocal enabledelayedexpansion

REM Default values (can be overridden by command line arguments)
set DEFAULT_HOST=proj03@project-1-03.eduhk.hk
set DEFAULT_PASSWORD=password:
set SCRIPT_NAME=docker_ip_change_script.sh
set REMOTE_SCRIPT_PATH=/tmp/%SCRIPT_NAME%
set LOCAL_SCRIPT_PATH=%~dp0%SCRIPT_NAME%

REM Parse command line arguments
if "%~1"=="" (
    set HOST=%DEFAULT_HOST%
) else (
    set HOST=%~1
)

if "%~2"=="" (
    set PASSWORD=%DEFAULT_PASSWORD%
) else (
    set PASSWORD=%~2
)

if "%~3"=="" (
    set SUDO_PASSWORD=%PASSWORD%
) else (
    set SUDO_PASSWORD=%~3
)

echo ========================================
echo Docker IP Change Automation Script
echo ========================================
echo Host: %HOST%
echo Script: %SCRIPT_NAME%
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
    echo Please ensure the docker_ip_change_script.sh file is in the same directory.
    pause
    exit /b 1
)

echo Step 1: Testing SSH connection...
plink -ssh -pw %PASSWORD% %HOST% "echo 'SSH connection successful'"
if errorlevel 1 (
    echo ERROR: Failed to connect via SSH. Please check credentials and network.
    pause
    exit /b 1
)

echo Step 2: Transferring script to remote server...
pscp -pw %PASSWORD% "%LOCAL_SCRIPT_PATH%" %HOST%:%REMOTE_SCRIPT_PATH%
if errorlevel 1 (
    echo ERROR: Failed to transfer script file.
    pause
    exit /b 1
)

echo Step 3: Making script executable...
plink -ssh -pw %PASSWORD% %HOST% "chmod +x %REMOTE_SCRIPT_PATH%"
if errorlevel 1 (
    echo ERROR: Failed to make script executable.
    pause
    exit /b 1
)

echo Step 4: Executing Docker IP change script...
echo Note: This will require sudo privileges and may take a few minutes...
echo Note: Using sudo password (assuming same as SSH password)...
plink -ssh -pw %PASSWORD% %HOST% "echo '%SUDO_PASSWORD%' | sudo -S %REMOTE_SCRIPT_PATH%"
if errorlevel 1 (
    echo ERROR: Script execution failed. This might be due to incorrect sudo password.
    echo Try running the script manually: ssh %HOST% "sudo %REMOTE_SCRIPT_PATH%"
    pause
    exit /b 1
)

echo Step 5: Cleaning up temporary files...
plink -ssh -pw %PASSWORD% %HOST% "rm -f %REMOTE_SCRIPT_PATH%"

echo ========================================
echo SUCCESS: Docker IP change completed!
echo ========================================
echo Docker should now be using 10.20.0.0/24 IP range.
echo You can verify by running: docker network ls
echo ========================================

pause
