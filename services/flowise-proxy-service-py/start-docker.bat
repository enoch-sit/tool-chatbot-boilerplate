@echo off
REM Start Docker Compose services with Hypercorn (as configured in Dockerfile)
echo ======================================================
echo Starting Docker services with Hypercorn ASGI server...
echo ======================================================

docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Docker is not running. Please start Docker Desktop and try again.
    exit /b 1
)

echo Starting containers...
docker-compose up -d

if %errorlevel% neq 0 (
    echo Error: Failed to start Docker containers.
    exit /b 1
)

echo.
echo ======================================================
echo Services started successfully!
echo.
echo The flowise-proxy service is running with Hypercorn at:
echo    http://localhost:8000
echo.
echo Useful commands:
echo    - View logs: docker-compose logs -f
echo    - Stop services: docker-compose down
echo    - Restart services: docker-compose restart
echo ======================================================
