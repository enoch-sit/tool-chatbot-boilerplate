@echo off
echo =========================================
echo Chat Service Simple Docker Start Script
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

REM Get current directory
set "scriptDir=%~dp0"

REM Start Chat Service
echo.
echo Starting Chat Service...
cd /d "%scriptDir%"
docker-compose up -d

echo.
echo Chat service has been started!
echo Chat service should be available at http://localhost:3002
echo Grafana dashboard available at http://localhost:3003
echo To view logs, use: docker-compose logs -f

REM Return to scripts directory
cd /d "%scriptDir%"