@echo off
setlocal

echo Checking for Docker...
docker --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Docker is not installed or not running. Please install Docker and ensure it is running.
    exit /b 1
)

echo Checking for Docker Compose...
docker compose version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Docker Compose is not installed. Please install Docker Compose.
    exit /b 1
)

echo Ensuring external networks exist...
docker network inspect boilerplate-accounting-nodejs-typescript_auth-network >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Creating auth-network...
    docker network create boilerplate-accounting-nodejs-typescript_auth-network
)
docker network inspect accounting-service_accounting-network >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Creating accounting-network...
    docker network create accounting-service_accounting-network
)

echo Rebuilding Langflow image...
docker build -t myuser/langflow-custom:1.0.0 .

echo Starting Docker Compose services...
docker compose down
docker compose up -d --build

echo Langflow is starting. Access it at http://localhost:7860/
echo To stop services, run: docker compose down

endlocal