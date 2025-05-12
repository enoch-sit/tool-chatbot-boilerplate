@echo off
echo =========================================
echo Chat Service Docker Rebuild Script
echo =========================================

set AUTH_URL=http://localhost:3000
set ACCOUNTING_URL=http://localhost:3001
set CHAT_URL=http://localhost:3002

set serviceDir=%~dp0
set rootDir=%serviceDir%..\..
set authDir=%rootDir%\authentication-service
set accountingDir=%rootDir%\services\accounting-service

cd %serviceDir%
echo Working directory: %CD%

echo.
echo Checking if Docker is running...
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Docker is not running. Please start Docker Desktop.
    goto :EOF
) else (
    echo Docker is running properly.
)

echo.
echo Checking services status:
echo 1. Checking Authentication service...
curl -s %AUTH_URL%/health >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo    Authentication service is running.
    set auth_running=1
) else (
    echo    Authentication service is NOT running.
    set auth_running=0
)

echo 2. Checking Accounting service...
curl -s %ACCOUNTING_URL%/health >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo    Accounting service is running.
    set accounting_running=1
) else (
    echo    Accounting service is NOT running.
    set accounting_running=0
)

echo 3. Checking Chat service...
curl -s %CHAT_URL%/api/health >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo    Chat service is running.
    set chat_running=1
) else (
    echo    Chat service is NOT running.
    set chat_running=0
)

if %auth_running% equ 0 (
    echo.
    echo Authentication service is not running but is required.
    set /p start_auth="Do you want to start Authentication service? (y/n): "
    if /i "%start_auth%"=="y" (
        if exist "%authDir%\docker-compose.yml" (
            echo Starting Authentication service...
            pushd "%authDir%"
            docker-compose up -d
            timeout /t 10 /nobreak >nul
            popd
        ) else (
            echo Authentication docker-compose.yml not found.
        )
    )
)

if %accounting_running% equ 0 (
    echo.
    echo Accounting service is not running but is required.
    set /p start_accounting="Do you want to start Accounting service? (y/n): "
    if /i "%start_accounting%"=="y" (
        if exist "%accountingDir%\docker-compose.yml" (
            echo Starting Accounting service...
            pushd "%accountingDir%"
            docker-compose up -d
            timeout /t 10 /nobreak >nul
            popd
        ) else (
            echo Accounting docker-compose.yml not found.
        )
    )
)

echo.
echo Stopping existing chat service containers...
docker-compose down

echo.
set /p remove_volumes="Do you want to remove database volumes? This will delete all data (y/n): "
if /i "%remove_volumes%"=="y" (
    echo Removing Docker volumes...
    for /f "tokens=*" %%i in ('docker volume ls -q --filter "name=chat-service_mongo-data"') do (
        docker volume rm %%i 2>nul
    )
    for /f "tokens=*" %%i in ('docker volume ls -q --filter "name=chat-service_redis-data"') do (
        docker volume rm %%i 2>nul
    )
)

echo.
echo Rebuilding and starting chat service containers...
docker-compose up -d --build

echo.
echo Waiting for services to start...
timeout /t 10 /nobreak >nul

echo.
echo Checking final status:
echo 1. Checking Authentication service...
curl -s %AUTH_URL%/health >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo    Authentication service is running.
) else (
    echo    Authentication service is NOT running.
)

echo 2. Checking Accounting service...
curl -s %ACCOUNTING_URL%/health >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo    Accounting service is running.
) else (
    echo    Accounting service is NOT running.
)

echo 3. Checking Chat service...
curl -s %CHAT_URL%/api/health >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo    Chat service is running.
    echo.
    echo Chat service was rebuilt and started successfully at %CHAT_URL%
) else (
    echo    Chat service is NOT running.
    echo.
    echo Failed to rebuild Chat service. Please check logs for errors.
)

echo.
echo To view logs, run: docker-compose logs -f
echo =========================================