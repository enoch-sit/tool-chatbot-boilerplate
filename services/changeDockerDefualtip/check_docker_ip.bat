@echo off
REM Script to check Docker's current IP configuration on remote server
REM Prerequisites:
REM - PuTTY tools (plink.exe, pscp.exe) must be installed and in PATH
REM - SSH access to the remote server
REM Usage: check_docker_ip.bat [hostname] [username] [password]

setlocal enabledelayedexpansion

REM Default values (can be overridden by command line arguments)
set DEFAULT_HOST=proj03@project-1-03.eduhk.hk
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
echo Docker IP Configuration Check Script
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
echo DOCKER NETWORK INFORMATION
echo ========================================

echo Step 2: Checking Docker daemon status...
plink -ssh -pw %PASSWORD% %HOST% "echo '%PASSWORD%' | sudo -S systemctl status docker --no-pager | head -10"
if errorlevel 1 (
    echo WARNING: Could not check Docker daemon status. Docker may not be running.
)

echo.
echo Step 3: Listing Docker networks...
plink -ssh -pw %PASSWORD% %HOST% "echo '%PASSWORD%' | sudo -S docker network ls"
if errorlevel 1 (
    echo ERROR: Failed to list Docker networks. Docker may not be running or accessible.
    pause
    exit /b 1
)

echo.
echo Step 4: Inspecting default bridge network...
plink -ssh -pw %PASSWORD% %HOST% "echo '%PASSWORD%' | sudo -S docker network inspect bridge | grep -E '\"Subnet\"|\"Gateway\"|\"IPAM\"|\"Config\"' -A 5"
if errorlevel 1 (
    echo ERROR: Failed to inspect bridge network.
    pause
    exit /b 1
)

echo.
echo Step 5: Checking Docker daemon configuration...
plink -ssh -pw %PASSWORD% %HOST% "echo '%PASSWORD%' | sudo -S cat /etc/docker/daemon.json 2>/dev/null || echo 'No daemon.json found - using Docker defaults'"

echo.
echo Step 6: Checking current Docker containers and their IPs...
plink -ssh -pw %PASSWORD% %HOST% "echo '%PASSWORD%' | sudo -S docker ps -q | xargs -I {} sudo docker inspect {} --format='Container: {{.Name}} - IP: {{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null || echo 'No running containers found'"

echo.
echo Step 7: Checking system network interfaces (Docker related)...
plink -ssh -pw %PASSWORD% %HOST% "ip addr show | grep -A 2 docker"

echo.
echo Step 8: Checking Docker version and system info...
plink -ssh -pw %PASSWORD% %HOST% "echo '%PASSWORD%' | sudo -S docker version --format 'Client: {{.Client.Version}} Server: {{.Server.Version}}' 2>/dev/null && echo && echo '%PASSWORD%' | sudo -S docker system info | grep -E 'Docker Root Dir|Default Runtime|Init Binary' 2>/dev/null"

echo.
echo ========================================
echo NETWORK ROUTING INFORMATION
echo ========================================

echo Step 9: Checking routing table for Docker networks...
plink -ssh -pw %PASSWORD% %HOST% "ip route | grep docker"

echo.
echo Step 10: Checking iptables rules (Docker related)...
plink -ssh -pw %PASSWORD% %HOST% "echo '%PASSWORD%' | sudo -S iptables -t nat -L DOCKER 2>/dev/null | head -10 || echo 'Could not access iptables DOCKER chain'"

echo.
echo ========================================
echo DOCKER IP CHECK COMPLETED
echo ========================================
echo Summary of key information:
echo - Docker networks listed above
echo - Bridge network subnet and gateway shown
echo - Container IPs displayed (if any containers running)
echo - System network interfaces related to Docker shown
echo ========================================
echo.
echo To change Docker's default IP range, run:
echo   automate_docker_ip_change.bat
echo ========================================

pause
