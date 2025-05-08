@echo off
echo =========================================
echo Chat Service Docker Start Script
echo =========================================

echo.
echo Checking if Docker is running...
docker info > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Docker is not running. Please start Docker Desktop before continuing.
    pause
    exit /b 1
) else (
    echo Docker is running properly.
)

REM Get service directories
set "scriptDir=%~dp0"
set "chatServiceDir=%scriptDir%"
for %%I in ("%scriptDir%\..\..\") do set "rootDir=%%~fI"
set "authServiceDir=%rootDir%authentication-service"
set "accountingServiceDir=%rootDir%accounting-service"

echo.
echo Starting services in order: Authentication -^> Accounting -^> Chat...

REM Start Authentication Service (if it exists)
if exist "%authServiceDir%\docker-compose.yml" (
    echo.
    echo Starting Authentication Service...
    cd /d "%authServiceDir%"
    docker-compose up -d
    echo Authentication Service started. Waiting for initialization...
    timeout /t 10 /nobreak > nul
)

REM Start Accounting Service (if it exists)
if exist "%accountingServiceDir%\docker-compose.yml" (
    echo.
    echo Starting Accounting Service...
    cd /d "%accountingServiceDir%"
    docker-compose up -d
    echo Accounting Service started. Waiting for initialization...
    timeout /t 10 /nobreak > nul
)

REM Start Chat Service
echo.
echo Starting Chat Service...
cd /d "%chatServiceDir%"
docker-compose up -d

echo.
echo All services have been started!
echo Chat service should be available at http://localhost:3002
echo Grafana dashboard available at http://localhost:3003
echo To view logs, use: docker-compose logs -f

REM Return to scripts directory
cd /d "%scriptDir%"