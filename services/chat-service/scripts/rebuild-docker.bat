@echo off
REM rebuild-docker.bat
REM Script to rebuild the chat service Docker containers

echo =========================================
echo Chat Service Docker Rebuild Script
echo =========================================

REM Function to check if a service is running
:CheckServiceHealth
set SERVICE_NAME=%~1
set SERVICE_URL=%~2
echo.
echo Checking %SERVICE_NAME% service at %SERVICE_URL%...

curl -s -f "%SERVICE_URL%/health" > nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo %SERVICE_NAME% is running ✓
    set SERVICE_RUNNING=1
) else (
    echo %SERVICE_NAME% is not running ✗
    set SERVICE_RUNNING=0
)
goto :EOF

REM Define service URLs
set AUTH_SERVICE_URL=http://localhost:3000
set ACCOUNTING_SERVICE_URL=http://localhost:3001
set CHAT_SERVICE_URL=http://localhost:3002

REM Get the directory of the current script and service directory
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "SERVICE_DIR=%%~fI"
for %%I in ("%SERVICE_DIR%\..\..\..") do set "ROOT_DIR=%%~fI"
set "AUTH_DIR=%ROOT_DIR%\authentication-service"
set "ACCOUNTING_DIR=%ROOT_DIR%\accounting-service"

REM Navigate to the service directory
cd /d "%SERVICE_DIR%"
echo Working directory: %SERVICE_DIR%

REM Check if Docker is running
echo.
echo Checking if Docker is running...
docker info > nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Docker is not running. Please start Docker before continuing.
    pause
    exit /b 1
)

REM Check if services are running before rebuild
echo.
echo Checking services status before rebuild:
call :CheckServiceHealth "Authentication" "%AUTH_SERVICE_URL%"
set AUTH_RUNNING=%SERVICE_RUNNING%

call :CheckServiceHealth "Accounting" "%ACCOUNTING_SERVICE_URL%"
set ACCOUNTING_RUNNING=%SERVICE_RUNNING%

call :CheckServiceHealth "Chat" "%CHAT_SERVICE_URL%"
set CHAT_RUNNING=%SERVICE_RUNNING%

REM Function to start a service if not running
:StartDockerService
set SERVICE_NAME=%~1
set SERVICE_DIR=%~2
set WAIT_FOR_STARTUP=%~3

echo.
echo Starting %SERVICE_NAME% service...

if exist "%SERVICE_DIR%\docker-compose.yml" (
    REM Change to the service directory
    pushd "%SERVICE_DIR%"
    
    REM Start the service using Docker Compose
    echo Running docker-compose up in %SERVICE_DIR%
    
    if "%WAIT_FOR_STARTUP%" == "true" (
        docker-compose up -d
        echo Waiting for %SERVICE_NAME% to start...
        timeout /t 10 /nobreak > nul
    ) else (
        start /b cmd /c "docker-compose up -d"
    )
    
    echo %SERVICE_NAME% service started successfully
    
    REM Return to the original directory
    popd
) else (
    echo docker-compose.yml not found in %SERVICE_DIR%
)
goto :EOF

REM Make sure dependencies are running (Auth and Accounting)
set DEPENDENCIES_STARTED=0

REM Start Authentication if not running (needed for shared network)
if %AUTH_RUNNING% equ 0 (
    echo.
    echo Authentication service is not running but is required.
    set /p START_AUTH="Do you want to start Authentication service? (y/n) "
    
    if /i "%START_AUTH%" == "y" (
        call :StartDockerService "Authentication" "%AUTH_DIR%" "true"
        set DEPENDENCIES_STARTED=1
        call :CheckServiceHealth "Authentication" "%AUTH_SERVICE_URL%"
        set AUTH_RUNNING=%SERVICE_RUNNING%
    )
)

REM Start Accounting if not running
if %ACCOUNTING_RUNNING% equ 0 (
    echo.
    echo Accounting service is not running but is recommended.
    set /p START_ACCOUNTING="Do you want to start Accounting service? (y/n) "
    
    if /i "%START_ACCOUNTING%" == "y" (
        call :StartDockerService "Accounting" "%ACCOUNTING_DIR%" "true"
        set DEPENDENCIES_STARTED=1
        call :CheckServiceHealth "Accounting" "%ACCOUNTING_SERVICE_URL%"
        set ACCOUNTING_RUNNING=%SERVICE_RUNNING%
    )
)

REM Return to chat service directory if we started dependencies
if %DEPENDENCIES_STARTED% equ 1 (
    cd /d "%SERVICE_DIR%"
)

REM Stop existing containers
echo.
echo Stopping existing chat service containers...
docker-compose down

REM Remove old images (optional - uncomment if needed)
REM echo.
REM echo Removing old images...
REM for /f %%i in ('docker images -q chat-service_chat-service 2^>nul') do docker rmi -f %%i

REM Rebuild and start the containers
echo.
echo Rebuilding and starting chat service containers...
docker-compose up -d --build

REM Wait for services to start
echo.
echo Waiting for services to start...
timeout /t 10 /nobreak > nul

REM Check if services are running after rebuild
echo.
echo Checking services status after rebuild:
call :CheckServiceHealth "Authentication" "%AUTH_SERVICE_URL%"
set AUTH_RUNNING=%SERVICE_RUNNING%

call :CheckServiceHealth "Accounting" "%ACCOUNTING_SERVICE_URL%"
set ACCOUNTING_RUNNING=%SERVICE_RUNNING%

call :CheckServiceHealth "Chat" "%CHAT_SERVICE_URL%"
set CHAT_RUNNING=%SERVICE_RUNNING%

REM Final status report
echo.
echo Final services status:
if %AUTH_RUNNING% equ 1 (
    echo Authentication: Running ✓
) else (
    echo Authentication: Not running ✗
)

if %ACCOUNTING_RUNNING% equ 1 (
    echo Accounting: Running ✓
) else (
    echo Accounting: Not running ✗
)

if %CHAT_RUNNING% equ 1 (
    echo Chat: Running ✓
    echo.
    echo Chat service was rebuilt and started successfully at http://localhost:3002
) else (
    echo Chat: Not running ✗
    echo.
    echo Failed to rebuild Chat service. Please check the logs for errors.
)

echo.
echo To view logs, run: docker-compose logs -f