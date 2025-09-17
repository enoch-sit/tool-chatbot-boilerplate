@echo off
REM Script to check Docker installation status on remote server
REM Prerequisites:
REM - PuTTY tools (plink.exe, pscp.exe) must be installed and in PATH
REM - SSH access to the remote server
REM Usage: check_docker_installation.bat [hostname] [username] [password]

setlocal enabledelayedexpansion

REM Default values (can be overridden by command line arguments)
set DEFAULT_HOST=proj04@project-1-04.eduhk.hk
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
echo Docker Installation Check Script
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
echo ========================================
echo DOCKER INSTALLATION DETECTION
echo ========================================

echo Step 2: Checking if Docker command exists...
plink -ssh -pw %PASSWORD% %HOST% "command -v docker >/dev/null 2>&1 && echo '✓ Docker command found' || echo '✗ Docker command not found'"

echo.
echo Step 3: Checking Docker version...
plink -ssh -pw %PASSWORD% %HOST% "docker --version 2>/dev/null || echo 'Docker version command failed'"

echo.
echo Step 4: Checking Docker installation type...
echo --- Checking for Snap installation ---
plink -ssh -pw %PASSWORD% %HOST% "command -v snap >/dev/null 2>&1 && snap list docker 2>/dev/null && echo '✓ Docker installed via SNAP' || echo '- Not installed via snap'"

echo --- Checking for APT/DEB installation ---
plink -ssh -pw %PASSWORD% %HOST% "dpkg -l | grep -E 'docker-ce|docker.io|containerd' || echo '- No Docker packages found via APT'"

echo --- Checking for manual installation ---
plink -ssh -pw %PASSWORD% %HOST% "command -v dockerd >/dev/null 2>&1 && echo '✓ Docker daemon (dockerd) found' || echo '- Docker daemon not found'"

echo.
echo ========================================
echo DOCKER SERVICE STATUS
echo ========================================

echo Step 5: Checking Docker service status...
echo --- Checking systemd service ---
plink -ssh -pw %PASSWORD% %HOST% "systemctl is-active docker 2>/dev/null && echo '✓ Docker systemd service is active' || echo '- Docker systemd service not active'"

echo --- Checking snap service ---
plink -ssh -pw %PASSWORD% %HOST% "command -v snap >/dev/null 2>&1 && snap services docker 2>/dev/null | grep -q active && echo '✓ Docker snap service is active' || echo '- Docker snap service not active or not installed'"

echo.
echo Step 6: Testing Docker functionality...
plink -ssh -pw %PASSWORD% %HOST% "echo '%PASSWORD%' | sudo -S docker info >/dev/null 2>&1 && echo '✓ Docker is responding to commands' || echo '✗ Docker is not responding (may need sudo or service is down)'"

echo.
echo ========================================
echo DOCKER CONFIGURATION FILES
echo ========================================

echo Step 7: Checking Docker configuration files...
echo --- Standard Docker config ---
plink -ssh -pw %PASSWORD% %HOST% "[ -f /etc/docker/daemon.json ] && echo '✓ Found: /etc/docker/daemon.json' && echo '%PASSWORD%' | sudo -S cat /etc/docker/daemon.json || echo '- No standard daemon.json found'"

echo --- Snap Docker config ---
plink -ssh -pw %PASSWORD% %HOST% "[ -f /var/snap/docker/current/config/daemon.json ] && echo '✓ Found: /var/snap/docker/current/config/daemon.json' && echo '%PASSWORD%' | sudo -S cat /var/snap/docker/current/config/daemon.json || echo '- No snap daemon.json found'"

echo.
echo ========================================
echo SYSTEM INFORMATION
echo ========================================

echo Step 8: Checking system information...
plink -ssh -pw %PASSWORD% %HOST% "echo 'OS: ' && lsb_release -d 2>/dev/null | cut -f2 || cat /etc/os-release | grep PRETTY_NAME"
plink -ssh -pw %PASSWORD% %HOST% "echo 'Kernel: ' && uname -r"
plink -ssh -pw %PASSWORD% %HOST% "echo 'Architecture: ' && uname -m"

echo.
echo Step 9: Checking Docker-related processes...
plink -ssh -pw %PASSWORD% %HOST% "ps aux | grep -E 'docker|containerd' | grep -v grep | head -5 || echo 'No Docker processes found'"

echo.
echo Step 10: Checking Docker storage and directories...
plink -ssh -pw %PASSWORD% %HOST% "[ -d /var/lib/docker ] && echo '✓ Docker storage directory exists: /var/lib/docker' && echo '%PASSWORD%' | sudo -S ls -la /var/lib/docker/ | head -5 || echo '- Standard Docker storage directory not found'"
plink -ssh -pw %PASSWORD% %HOST% "[ -d /var/snap/docker ] && echo '✓ Snap Docker directory exists: /var/snap/docker' || echo '- Snap Docker directory not found'"

echo.
echo ========================================
echo INSTALLATION RECOMMENDATIONS
echo ========================================

echo Step 11: Providing installation recommendations...
plink -ssh -pw %PASSWORD% %HOST% "if ! command -v docker >/dev/null 2>&1; then echo 'RECOMMENDATION: Docker not installed. Install options:'; echo '1. Snap: sudo snap install docker'; echo '2. APT: curl -fsSL https://get.docker.com | sh'; echo '3. Manual: Follow Docker official docs'; else echo 'Docker appears to be installed.'; fi"

echo.
echo ========================================
echo DOCKER INSTALLATION CHECK COMPLETED
echo ========================================
echo Summary:
echo - Docker command availability checked
echo - Installation method detected
echo - Service status verified  
echo - Configuration files located
echo - System compatibility confirmed
echo ========================================
echo.
echo Next steps:
echo - If Docker is not installed: Follow installation recommendations above
echo - If Docker is installed but not working: Check service status and logs
echo - To check Docker IP configuration: check_docker_ip.bat
echo - To change Docker IP: automate_docker_ip_change.bat
echo ========================================

pause
