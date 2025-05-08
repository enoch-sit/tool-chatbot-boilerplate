@echo off
REM rebuild-docker.bat
REM Script to rebuild the accounting service Docker containers

echo =========================================
echo Accounting Service Docker Rebuild Script
echo =========================================

REM Define service URLs
SET AUTH_SERVICE_URL=http://localhost:3000
SET ACCOUNTING_SERVICE_URL=http://localhost:3001

REM Get the directory of the current script
SET serviceDir=%~dp0
SET rootDir=%serviceDir%..\..
SET authDir=%rootDir%\authentication-service

REM Navigate to the service directory
cd %serviceDir%
echo Working directory: %serviceDir%

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

REM Check services status before rebuild
echo.
echo Checking services status before rebuild:
echo Checking Authentication service at %AUTH_SERVICE_URL%...
curl -s %AUTH_SERVICE_URL%/health > nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Authentication is running √
    SET authRunning=true
) else (
    echo Authentication is not running ×
    SET authRunning=false
)

echo Checking Accounting service at %ACCOUNTING_SERVICE_URL%...
curl -s %ACCOUNTING_SERVICE_URL%/health > nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Accounting is running √
    SET accountingRunning=true
) else (
    echo Accounting is not running ×
    SET accountingRunning=false
)

REM Variable to track if dependencies were started
SET dependenciesStarted=false

REM Start Authentication if not running (needed for shared network)
if "%authRunning%"=="false" (
    echo.
    echo Authentication service is not running but is required.
    SET /P startAuth=Do you want to start Authentication service? (y/n): 
    
    if /I "%startAuth%"=="y" (
        echo.
        echo Starting Authentication service...
        
        if exist "%authDir%\docker-compose.yml" (
            pushd "%authDir%"
            echo Running docker-compose up in %authDir%
            docker-compose up -d
            echo Waiting for Authentication to start...
            timeout /t 10 > nul
            popd
            
            SET dependenciesStarted=true
            
            REM Check again if auth is running
            echo Checking Authentication service at %AUTH_SERVICE_URL%...
            curl -s %AUTH_SERVICE_URL%/health > nul 2>&1
            if %ERRORLEVEL% EQU 0 (
                echo Authentication is running √
                SET authRunning=true
            ) else (
                echo Authentication is not running ×
                SET authRunning=false
            )
        ) else (
            echo docker-compose.yml not found in %authDir%
        )
    )
)

REM Return to accounting service directory if we started dependencies
if "%dependenciesStarted%"=="true" (
    cd %serviceDir%
)

REM Stop existing containers
echo.
echo Stopping existing accounting service containers...
docker-compose down

REM Ask about removing volumes
SET /P removeVolumes=Do you want to remove database volumes? This will delete all data (y/n): 
if /I "%removeVolumes%"=="y" (
    echo Removing Docker volumes...
    for /f "tokens=*" %%i in ('docker volume ls -q --filter name^=accounting-service_postgres-data') do (
        docker volume rm %%i 2>nul
    )
)

REM Rebuild and start the containers
echo.
echo Rebuilding and starting accounting service containers...
docker-compose up -d --build

REM Wait for services to start
echo.
echo Waiting for services to start...
timeout /t 10 > nul

REM Check if services are running after rebuild
echo.
echo Checking services status after rebuild:
echo Checking Authentication service at %AUTH_SERVICE_URL%...
curl -s %AUTH_SERVICE_URL%/health > nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Authentication is running √
    SET authRunning=true
) else (
    echo Authentication is not running ×
    SET authRunning=false
)

echo Checking Accounting service at %ACCOUNTING_SERVICE_URL%...
curl -s %ACCOUNTING_SERVICE_URL%/health > nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Accounting is running √
    SET accountingRunning=true
) else (
    echo Accounting is not running ×
    SET accountingRunning=false
)

REM Final status report
echo.
echo Final services status:
if "%authRunning%"=="true" (
    echo Authentication: Running √
) else (
    echo Authentication: Not running ×
)

if "%accountingRunning%"=="true" (
    echo Accounting: Running √
    echo.
    echo Accounting service was rebuilt and started successfully at http://localhost:3001
) else (
    echo Accounting: Not running ×
    echo.
    echo Failed to rebuild Accounting service. Please check the logs for errors.
)

echo.
echo To view logs, run: docker-compose logs -f

REM End of script