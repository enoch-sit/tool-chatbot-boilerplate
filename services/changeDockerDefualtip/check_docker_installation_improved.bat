@echo off
REM Improved script to check Docker installation status on remote server (Single SSH session)
REM Prerequisites:
REM - PuTTY tools (plink.exe, pscp.exe) must be installed and in PATH
REM - SSH access to the remote server
REM Usage: check_docker_installation_improved.bat [hostname] [username] [password]

setlocal enabledelayedexpansion

REM Default values (can be overridden by command line arguments)
set DEFAULT_HOST=proj05@project-1-05.eduhk.hk
set DEFAULT_PASSWORD=password:

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

echo ========================================
echo Docker Installation Check Script (Improved)
echo ========================================
echo Host: %HOST%
echo ========================================

REM Check if PuTTY tools are available
where plink >nul 2>&1
if errorlevel 1 (
    echo ERROR: plink.exe not found in PATH. Please install PuTTY tools.
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

echo.
echo Executing comprehensive Docker check in single SSH session...
echo ========================================

REM Create a temporary script file for comprehensive checking
set TEMP_SCRIPT=%TEMP%\docker_check_%RANDOM%.sh

echo #!/bin/bash > "%TEMP_SCRIPT%"
echo echo "========================================" >> "%TEMP_SCRIPT%"
echo echo "DOCKER INSTALLATION DETECTION" >> "%TEMP_SCRIPT%"
echo echo "========================================" >> "%TEMP_SCRIPT%"
echo echo >> "%TEMP_SCRIPT%"
echo echo "Step 2: Checking if Docker command exists..." >> "%TEMP_SCRIPT%"
echo command -v docker >/dev/null 2>&1 ^&^& echo "✓ Docker command found" ^|^| echo "✗ Docker command not found" >> "%TEMP_SCRIPT%"
echo echo >> "%TEMP_SCRIPT%"
echo echo "Step 3: Checking Docker version..." >> "%TEMP_SCRIPT%"
echo docker --version 2>/dev/null ^|^| echo "Docker version command failed" >> "%TEMP_SCRIPT%"
echo echo >> "%TEMP_SCRIPT%"
echo echo "Step 4: Checking Docker installation type..." >> "%TEMP_SCRIPT%"
echo echo "--- Checking for Snap installation ---" >> "%TEMP_SCRIPT%"
echo command -v snap >/dev/null 2>&1 ^&^& snap list docker 2>/dev/null ^&^& echo "✓ Docker installed via SNAP" ^|^| echo "- Not installed via snap" >> "%TEMP_SCRIPT%"
echo echo "--- Checking for APT/DEB installation ---" >> "%TEMP_SCRIPT%"
echo dpkg -l ^| grep -E "docker-ce^|docker.io^|containerd" ^|^| echo "- No Docker packages found via APT" >> "%TEMP_SCRIPT%"
echo echo "--- Checking for manual installation ---" >> "%TEMP_SCRIPT%"
echo command -v dockerd >/dev/null 2>&1 ^&^& echo "✓ Docker daemon (dockerd) found" ^|^| echo "- Docker daemon not found" >> "%TEMP_SCRIPT%"
echo echo >> "%TEMP_SCRIPT%"
echo echo "========================================" >> "%TEMP_SCRIPT%"
echo echo "DOCKER SERVICE STATUS" >> "%TEMP_SCRIPT%"
echo echo "========================================" >> "%TEMP_SCRIPT%"
echo echo >> "%TEMP_SCRIPT%"
echo echo "Step 5: Checking Docker service status..." >> "%TEMP_SCRIPT%"
echo echo "--- Checking systemd service ---" >> "%TEMP_SCRIPT%"
echo systemctl is-active docker 2>/dev/null ^&^& echo "✓ Docker systemd service is active" ^|^| echo "- Docker systemd service not active" >> "%TEMP_SCRIPT%"
echo echo "--- Checking snap service ---" >> "%TEMP_SCRIPT%"
echo command -v snap >/dev/null 2>&1 ^&^& snap services docker 2>/dev/null ^| grep -q active ^&^& echo "✓ Docker snap service is active" ^|^| echo "- Docker snap service not active or not installed" >> "%TEMP_SCRIPT%"
echo echo >> "%TEMP_SCRIPT%"
echo echo "Step 6: Testing Docker functionality..." >> "%TEMP_SCRIPT%"
echo timeout 10 docker info >/dev/null 2>&1 ^&^& echo "✓ Docker is responding to commands" ^|^| echo "✗ Docker is not responding (may need sudo or service is down)" >> "%TEMP_SCRIPT%"
echo echo >> "%TEMP_SCRIPT%"
echo echo "========================================" >> "%TEMP_SCRIPT%"
echo echo "DOCKER CONFIGURATION FILES" >> "%TEMP_SCRIPT%"
echo echo "========================================" >> "%TEMP_SCRIPT%"
echo echo >> "%TEMP_SCRIPT%"
echo echo "Step 7: Checking Docker configuration files..." >> "%TEMP_SCRIPT%"
echo echo "--- Standard Docker config ---" >> "%TEMP_SCRIPT%"
echo [ -f /etc/docker/daemon.json ] ^&^& echo "✓ Found: /etc/docker/daemon.json" ^&^& sudo cat /etc/docker/daemon.json 2>/dev/null ^|^| echo "- No standard daemon.json found" >> "%TEMP_SCRIPT%"
echo echo "--- Snap Docker config ---" >> "%TEMP_SCRIPT%"
echo [ -f /var/snap/docker/current/config/daemon.json ] ^&^& echo "✓ Found: /var/snap/docker/current/config/daemon.json" ^&^& sudo cat /var/snap/docker/current/config/daemon.json 2>/dev/null ^|^| echo "- No snap daemon.json found" >> "%TEMP_SCRIPT%"
echo echo >> "%TEMP_SCRIPT%"
echo echo "========================================" >> "%TEMP_SCRIPT%"
echo echo "SYSTEM INFORMATION" >> "%TEMP_SCRIPT%"
echo echo "========================================" >> "%TEMP_SCRIPT%"
echo echo >> "%TEMP_SCRIPT%"
echo echo "Step 8: Checking system information..." >> "%TEMP_SCRIPT%"
echo echo -n "OS: " ^&^& (lsb_release -d 2>/dev/null ^| cut -f2 ^|^| cat /etc/os-release ^| grep PRETTY_NAME ^| cut -d= -f2 ^| tr -d '"') >> "%TEMP_SCRIPT%"
echo echo -n "Kernel: " ^&^& uname -r >> "%TEMP_SCRIPT%"
echo echo -n "Architecture: " ^&^& uname -m >> "%TEMP_SCRIPT%"
echo echo >> "%TEMP_SCRIPT%"
echo echo "Step 9: Checking Docker-related processes..." >> "%TEMP_SCRIPT%"
echo ps aux ^| grep -E "docker^|containerd" ^| grep -v grep ^| head -5 ^|^| echo "No Docker processes found" >> "%TEMP_SCRIPT%"
echo echo >> "%TEMP_SCRIPT%"
echo echo "Step 10: Checking Docker storage and directories..." >> "%TEMP_SCRIPT%"
echo [ -d /var/lib/docker ] ^&^& echo "✓ Docker storage directory exists: /var/lib/docker" ^&^& sudo ls -la /var/lib/docker/ 2>/dev/null ^| head -5 ^|^| echo "- Standard Docker storage directory not found" >> "%TEMP_SCRIPT%"
echo [ -d /var/snap/docker ] ^&^& echo "✓ Snap Docker directory exists: /var/snap/docker" ^|^| echo "- Snap Docker directory not found" >> "%TEMP_SCRIPT%"
echo echo >> "%TEMP_SCRIPT%"
echo echo "========================================" >> "%TEMP_SCRIPT%"
echo echo "INSTALLATION RECOMMENDATIONS" >> "%TEMP_SCRIPT%"
echo echo "========================================" >> "%TEMP_SCRIPT%"
echo echo >> "%TEMP_SCRIPT%"
echo echo "Step 11: Providing installation recommendations..." >> "%TEMP_SCRIPT%"
echo if ! command -v docker >/dev/null 2>&1; then echo "RECOMMENDATION: Docker not installed. Install options:"; echo "1. Snap: sudo snap install docker"; echo "2. APT: curl -fsSL https://get.docker.com ^| sh"; echo "3. Manual: Follow Docker official docs"; else echo "Docker appears to be installed."; fi >> "%TEMP_SCRIPT%"
echo echo >> "%TEMP_SCRIPT%"
echo echo "========================================" >> "%TEMP_SCRIPT%"
echo echo "DOCKER INSTALLATION CHECK COMPLETED" >> "%TEMP_SCRIPT%"
echo echo "========================================" >> "%TEMP_SCRIPT%"

echo Uploading and executing comprehensive check script...
pscp -pw %PASSWORD% "%TEMP_SCRIPT%" %HOST%:/tmp/docker_check.sh
if errorlevel 1 (
    echo ERROR: Failed to upload check script.
    del "%TEMP_SCRIPT%"
    pause
    exit /b 1
)

plink -ssh -pw %PASSWORD% %HOST% "chmod +x /tmp/docker_check.sh && /tmp/docker_check.sh && rm -f /tmp/docker_check.sh"

del "%TEMP_SCRIPT%"

echo.
echo ========================================
echo Next steps:
echo - If Docker is not installed: Follow installation recommendations above
echo - If Docker is installed but not working: Check service status and logs
echo - To check Docker IP configuration: check_docker_ip.bat
echo - To change Docker IP: automate_docker_ip_change.bat
echo ========================================

pause
