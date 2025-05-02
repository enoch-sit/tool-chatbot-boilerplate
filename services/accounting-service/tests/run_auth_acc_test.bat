@echo off
REM Auth-Accounting Workflow Test Runner Batch Script
REM This script checks if the necessary services are running and runs the Auth-Accounting workflow test

title Auth-Accounting Workflow Test Runner

echo [36mAuth-Accounting Workflow Test Runner[0m
echo [36m=====================================[0m
echo [36mChecking if required services are running...[0m

REM Configuration
set AUTH_SERVICE_URL=http://localhost:3000
set ACCOUNTING_SERVICE_URL=http://localhost:3001

REM Check if services are running
echo [33mChecking Authentication service at %AUTH_SERVICE_URL%...[0m
curl -s -o nul -w "%%{http_code}" "%AUTH_SERVICE_URL%/health" -m 5 > temp.txt
set /p statuscode=<temp.txt
del temp.txt

if "%statuscode%"=="200" (
    echo [32mAuthentication is running ✅[0m
    set auth_running=true
) else (
    echo [31mAuthentication is not running ❌[0m
    set auth_running=false
)

echo [33mChecking Accounting service at %ACCOUNTING_SERVICE_URL%...[0m
curl -s -o nul -w "%%{http_code}" "%ACCOUNTING_SERVICE_URL%/health" -m 5 > temp.txt
set /p statuscode=<temp.txt
del temp.txt

if "%statuscode%"=="200" (
    echo [32mAccounting is running ✅[0m
    set accounting_running=true
) else (
    echo [31mAccounting is not running ❌[0m
    set accounting_running=false
)

REM Get paths to service directories
set current_dir=%~dp0
set root_dir=%current_dir%..\..
set auth_dir=%root_dir%\authentication-service
set accounting_dir=%root_dir%\accounting-service

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo.
    echo [31mDocker is not running. Please start Docker Desktop before continuing.[0m
    pause
    exit /b
)

REM Start services if they're not running
set services_started=false

REM Start Authentication if not running
if "%auth_running%"=="false" (
    echo.
    echo [36mStarting Authentication service...[0m
    
    if exist "%auth_dir%\docker-compose.yml" (
        pushd "%auth_dir%"
        
        echo [33mRunning docker-compose up in %auth_dir%[0m
        docker-compose up -d
        echo [33mWaiting for Authentication to start...[0m
        timeout /t 10 /nobreak > nul
        
        echo [32mAuthentication service started successfully[0m
        
        popd
        
        REM Check again if service is running
        curl -s -o nul -w "%%{http_code}" "%AUTH_SERVICE_URL%/health" -m 5 > temp.txt
        set /p statuscode=<temp.txt
        del temp.txt
        
        if "%statuscode%"=="200" (
            set auth_running=true
        )
    ) else (
        echo [31mdocker-compose.yml not found in %auth_dir%[0m
    )
)

REM Start Accounting if not running
if "%accounting_running%"=="false" (
    echo.
    echo [36mStarting Accounting service...[0m
    
    if exist "%accounting_dir%\docker-compose.yml" (
        pushd "%accounting_dir%"
        
        echo [33mRunning docker-compose up in %accounting_dir%[0m
        docker-compose up -d
        echo [33mWaiting for Accounting to start...[0m
        timeout /t 10 /nobreak > nul
        
        echo [32mAccounting service started successfully[0m
        
        popd
        
        REM Check again if service is running
        curl -s -o nul -w "%%{http_code}" "%ACCOUNTING_SERVICE_URL%/health" -m 5 > temp.txt
        set /p statuscode=<temp.txt
        del temp.txt
        
        if "%statuscode%"=="200" (
            set accounting_running=true
        )
    ) else (
        echo [31mdocker-compose.yml not found in %accounting_dir%[0m
    )
)

REM Final status check
echo.
echo [36mServices status:[0m
if "%auth_running%"=="true" (
    echo [32mAuthentication: Running ✅[0m
) else (
    echo [31mAuthentication: Not running ❌[0m
)

if "%accounting_running%"=="true" (
    echo [32mAccounting: Running ✅[0m
) else (
    echo [31mAccounting: Not running ❌[0m
)

REM Check if we can run the test
if not "%auth_running%"=="true" (
    goto services_not_running
)
if not "%accounting_running%"=="true" (
    goto services_not_running
)

REM Activate the virtual environment and run the test
cd /d "%current_dir%"

echo.
echo [36mActivating virtual environment...[0m

REM Activate the virtual environment
if exist ".\venv\Scripts\activate.bat" (
    call .\venv\Scripts\activate.bat
    
    echo.
    echo [36mRunning Auth-Accounting workflow test...[0m
    python workflow_test_Auth_Acc.py
    
    echo.
    echo [32mTest complete.[0m
) else (
    echo.
    echo [31mVirtual environment not found. Please create it first using install.bat[0m
)

goto end

:services_not_running
echo.
echo [31mCannot run Auth-Accounting workflow test because one or more required services are not running.[0m

:end
pause