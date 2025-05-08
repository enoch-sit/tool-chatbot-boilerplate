@echo off
REM simple-start-docker.bat
REM A simplified script to start the accounting service Docker containers

echo =========================================
echo Accounting Service Simple Docker Start Script
echo =========================================

REM Check if Docker is running
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
SET scriptDir=%~dp0
SET accountingServiceDir=%scriptDir%
SET rootDir=%accountingServiceDir%..\..
SET authServiceDir=%rootDir%\authentication-service

REM Start services in order
echo.
echo Starting services in order: Authentication -^> Accounting...

REM Start Authentication Service (if it exists)
if exist "%authServiceDir%\docker-compose.yml" (
    echo.
    echo Starting Authentication Service...
    pushd "%authServiceDir%"
    docker-compose up -d
    echo Authentication Service started. Waiting for initialization...
    timeout /t 10 > nul
    popd
)

REM Start Accounting Service
echo.
echo Starting Accounting Service...
pushd "%accountingServiceDir%"
docker-compose up -d
popd

echo.
echo All services have been started!
echo Accounting service should be available at http://localhost:3001
echo To view logs, use: docker-compose logs -f

REM Return to scripts directory
cd %scriptDir%