@echo off
REM start-docker.bat
REM Script to start the chat service Docker containers

echo =========================================
echo Chat Service Docker Start Script
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

REM Check if Docker is running
echo.
echo Checking if Docker is running...
docker info > nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Docker is not running. Please start Docker before continuing.
    pause
    exit /b 1
)

REM Check if services are running
call :CheckServiceHealth "Authentication" "%AUTH_SERVICE_URL%"
set AUTH_RUNNING=%SERVICE_RUNNING%

call :CheckServiceHealth "Accounting" "%ACCOUNTING_SERVICE_URL%"
set ACCOUNTING_RUNNING=%SERVICE_RUNNING%

call :CheckServiceHealth "Chat" "%CHAT_SERVICE_URL%"
set CHAT_RUNNING=%SERVICE_RUNNING%

REM Print services status
echo.
echo Services status:
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
) else (
    echo Chat: Not running ✗
)

REM Get the path to the service directories
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "SERVICE_DIR=%%~fI"
for %%I in ("%SERVICE_DIR%\..\..\..") do set "ROOT_DIR=%%~fI"
set "AUTH_DIR=%ROOT_DIR%\authentication-service"
set "ACCOUNTING_DIR=%ROOT_DIR%\accounting-service"
set "CHAT_DIR=%SERVICE_DIR%"

REM Function to start a service using docker-compose
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

REM Services need to be started in order: Authentication -> Accounting -> Chat
set SERVICES_STARTED=0

REM Start Authentication if not running (needed for shared network)
if %AUTH_RUNNING% equ 0 (
    call :StartDockerService "Authentication" "%AUTH_DIR%" "true"
    set SERVICES_STARTED=1
    
    REM Check again if service is running
    call :CheckServiceHealth "Authentication" "%AUTH_SERVICE_URL%"
    set AUTH_RUNNING=%SERVICE_RUNNING%
)

REM Start Accounting if not running
if %ACCOUNTING_RUNNING% equ 0 (
    call :StartDockerService "Accounting" "%ACCOUNTING_DIR%" "true"
    set SERVICES_STARTED=1
    
    REM Check again if service is running
    call :CheckServiceHealth "Accounting" "%ACCOUNTING_SERVICE_URL%"
    set ACCOUNTING_RUNNING=%SERVICE_RUNNING%
)

REM Start Chat if not running
if %CHAT_RUNNING% equ 0 (
    call :StartDockerService "Chat" "%CHAT_DIR%" "true"
    set SERVICES_STARTED=1
    
    REM Check again if service is running
    call :CheckServiceHealth "Chat" "%CHAT_SERVICE_URL%"
    set CHAT_RUNNING=%SERVICE_RUNNING%
)

REM Final status check
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
) else (
    echo Chat: Not running ✗
)

REM Summary message
if %CHAT_RUNNING% equ 1 (
    echo.
    echo Chat service is running successfully at http://localhost:3002
    echo To view logs, run: docker-compose logs -f
) else (
    echo.
    echo Failed to start Chat service. Please check the errors above.
)