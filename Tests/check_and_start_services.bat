@echo off
REM check_and_start_services.bat
REM Script to check if required services are running and start them if needed

echo ==================================================
echo Checking and starting required services...
echo ==================================================

REM Define service URLs and paths
set AUTH_SERVICE_URL=http://localhost:3000
set ACCOUNTING_SERVICE_URL=http://localhost:3001
set CHAT_SERVICE_URL=http://localhost:3002

REM Set paths to service directories
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "ROOT_DIR=%%~fI"
set "AUTH_DIR=%ROOT_DIR%\services\authentication-service"
set "ACCOUNTING_DIR=%ROOT_DIR%\services\accounting-service"
set "CHAT_DIR=%ROOT_DIR%\services\chat-service"

REM Create results directory if it doesn't exist
set "RESULTS_DIR=%SCRIPT_DIR%results"
if not exist "%RESULTS_DIR%" (
    mkdir "%RESULTS_DIR%"
    echo Created results directory: %RESULTS_DIR%
)

REM Create timestamp for the log file
for /f "tokens=1-5 delims=/ " %%d in ("%date%") do (
    set datestamp=%%f-%%e-%%d
)
for /f "tokens=1-3 delims=: " %%a in ("%time%") do (
    set timestamp=%%a-%%b-%%c
)
set timestamp=%timestamp:.=-%
set LOG_FILE=%RESULTS_DIR%\service_check_%datestamp%_%timestamp%.log

echo Service check started at %date% %time% > "%LOG_FILE%"
echo. >> "%LOG_FILE%"

REM Check if Docker is running
echo.
echo Checking if Docker is running...
echo Checking if Docker is running... >> "%LOG_FILE%"
docker info > nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Docker is not running. Please start Docker before continuing.
    echo Docker is not running. Please start Docker before continuing. >> "%LOG_FILE%"
    exit /b 1
) else (
    echo Docker is running properly [OK]
    echo Docker is running properly [OK] >> "%LOG_FILE%"
)

REM Check if services are running
call :CheckServiceHealth "Authentication" "%AUTH_SERVICE_URL%"
set AUTH_RUNNING=%ERRORLEVEL%
set AUTH_STATUS=%SERVICE_RUNNING%

call :CheckServiceHealth "Accounting" "%ACCOUNTING_SERVICE_URL%"
set ACCOUNTING_RUNNING=%ERRORLEVEL%
set ACCOUNTING_STATUS=%SERVICE_RUNNING%

call :CheckServiceHealth "Chat" "%CHAT_SERVICE_URL%"
set CHAT_RUNNING=%ERRORLEVEL%
set CHAT_STATUS=%SERVICE_RUNNING%

REM Print services status
echo.
echo Services status:
echo Services status: >> "%LOG_FILE%"
if %AUTH_STATUS% equ 1 (
    echo Authentication: Running [OK]
    echo Authentication: Running [OK] >> "%LOG_FILE%"
) else (
    echo Authentication: Not running [FAIL]
    echo Authentication: Not running [FAIL] >> "%LOG_FILE%"
)

if %ACCOUNTING_STATUS% equ 1 (
    echo Accounting: Running [OK]
    echo Accounting: Running [OK] >> "%LOG_FILE%"
) else (
    echo Accounting: Not running [FAIL]
    echo Accounting: Not running [FAIL] >> "%LOG_FILE%"
)

if %CHAT_STATUS% equ 1 (
    echo Chat: Running [OK]
    echo Chat: Running [OK] >> "%LOG_FILE%"
) else (
    echo Chat: Not running [FAIL]
    echo Chat: Not running [FAIL] >> "%LOG_FILE%"
)

REM Services need to be started in order: Authentication -> Accounting -> Chat
set SERVICES_STARTED=0

REM Start Authentication if not running (needed for shared network)
if %AUTH_STATUS% equ 0 (
    echo.
    echo Authentication service is required but not running.
    echo Authentication service is required but not running. >> "%LOG_FILE%"
    call :StartDockerService "Authentication" "%AUTH_DIR%" "true"
    set SERVICES_STARTED=1
    
    REM Check again if service is running
    call :CheckServiceHealth "Authentication" "%AUTH_SERVICE_URL%"
    set AUTH_STATUS=%SERVICE_RUNNING%
    
    if %AUTH_STATUS% equ 0 (
        echo Failed to start Authentication service. Cannot proceed.
        echo Failed to start Authentication service. Cannot proceed. >> "%LOG_FILE%"
        exit /b 1
    ) else (
        echo Authentication service started successfully [OK]
        echo Authentication service started successfully [OK] >> "%LOG_FILE%"
    )
) else (
    echo Authentication service is already running [OK]
    echo Authentication service is already running [OK] >> "%LOG_FILE%"
)

REM Start Accounting if not running
if %ACCOUNTING_STATUS% equ 0 (
    echo.
    echo Accounting service is required but not running.
    echo Accounting service is required but not running. >> "%LOG_FILE%"
    
    REM Make sure Authentication is running first (dependency)
    if %AUTH_STATUS% equ 1 (
        call :StartDockerService "Accounting" "%ACCOUNTING_DIR%" "true"
        set SERVICES_STARTED=1
        
        REM Check again if service is running
        call :CheckServiceHealth "Accounting" "%ACCOUNTING_SERVICE_URL%"
        set ACCOUNTING_STATUS=%SERVICE_RUNNING%
        
        if %ACCOUNTING_STATUS% equ 0 (
            echo Failed to start Accounting service. Cannot proceed.
            echo Failed to start Accounting service. Cannot proceed. >> "%LOG_FILE%"
            
            REM Try rebuilding Accounting service if first start attempt failed
            echo Attempting to rebuild Accounting service...
            echo Attempting to rebuild Accounting service... >> "%LOG_FILE%"
            
            pushd "%ACCOUNTING_DIR%"
            
            if exist "rebuild-docker.bat" (
                call rebuild-docker.bat >nul
            ) else (
                docker-compose down >nul 2>&1
                docker-compose up -d --build >nul
            )
            
            popd
            
            REM Wait a bit longer for rebuild
            timeout /t 20 /nobreak > nul
            
            REM Check one more time
            call :CheckServiceHealth "Accounting" "%ACCOUNTING_SERVICE_URL%"
            set ACCOUNTING_STATUS=%SERVICE_RUNNING%
            
            if %ACCOUNTING_STATUS% equ 0 (
                echo Rebuild attempt failed. Accounting service still not responding.
                echo Rebuild attempt failed. Accounting service still not responding. >> "%LOG_FILE%"
                exit /b 1
            ) else (
                echo Accounting service successfully rebuilt and running [OK]
                echo Accounting service successfully rebuilt and running [OK] >> "%LOG_FILE%"
            )
        ) else (
            echo Accounting service started successfully [OK]
            echo Accounting service started successfully [OK] >> "%LOG_FILE%"
        )
    ) else (
        echo Cannot start Accounting service because Authentication service is not running.
        echo Cannot start Accounting service because Authentication service is not running. >> "%LOG_FILE%"
        exit /b 1
    )
) else (
    echo Accounting service is already running [OK]
    echo Accounting service is already running [OK] >> "%LOG_FILE%"
)

REM Start Chat if not running
if %CHAT_STATUS% equ 0 (
    echo.
    echo Chat service is required but not running.
    echo Chat service is required but not running. >> "%LOG_FILE%"
    
    REM Make sure both Auth and Accounting are running (dependencies)
    if %AUTH_STATUS% equ 1 (
        if %ACCOUNTING_STATUS% equ 1 (
            call :StartDockerService "Chat" "%CHAT_DIR%" "true"
            set SERVICES_STARTED=1
            
            REM Check again if service is running
            call :CheckServiceHealth "Chat" "%CHAT_SERVICE_URL%"
            set CHAT_STATUS=%SERVICE_RUNNING%
            
            if %CHAT_STATUS% equ 0 (
                echo Failed to start Chat service. Cannot proceed.
                echo Failed to start Chat service. Cannot proceed. >> "%LOG_FILE%"
                exit /b 1
            ) else (
                echo Chat service started successfully [OK]
                echo Chat service started successfully [OK] >> "%LOG_FILE%"
            )
        ) else (
            echo Cannot start Chat service because Accounting service is not running.
            echo Cannot start Chat service because Accounting service is not running. >> "%LOG_FILE%"
            exit /b 1
        )
    ) else (
        echo Cannot start Chat service because Authentication service is not running.
        echo Cannot start Chat service because Authentication service is not running. >> "%LOG_FILE%"
        exit /b 1
    )
) else (
    echo Chat service is already running [OK]
    echo Chat service is already running [OK] >> "%LOG_FILE%"
)

REM Final status check
echo.
echo Final services status:
echo Final services status: >> "%LOG_FILE%"
if %AUTH_STATUS% equ 1 (
    echo Authentication: Running [OK]
    echo Authentication: Running [OK] >> "%LOG_FILE%"
) else (
    echo Authentication: Not running [FAIL]
    echo Authentication: Not running [FAIL] >> "%LOG_FILE%"
    exit /b 1
)

if %ACCOUNTING_STATUS% equ 1 (
    echo Accounting: Running [OK]
    echo Accounting: Running [OK] >> "%LOG_FILE%"
) else (
    echo Accounting: Not running [FAIL]
    echo Accounting: Not running [FAIL] >> "%LOG_FILE%"
    exit /b 1
)

if %CHAT_STATUS% equ 1 (
    echo Chat: Running [OK]
    echo Chat: Running [OK] >> "%LOG_FILE%"
) else (
    echo Chat: Not running [FAIL]
    echo Chat: Not running [FAIL] >> "%LOG_FILE%"
    exit /b 1
)

echo.
echo All required services are running! [OK]
echo All required services are running! [OK] >> "%LOG_FILE%"
echo Service check completed at %date% %time% >> "%LOG_FILE%"
exit /b 0

REM =================== FUNCTION DEFINITIONS ===================
:CheckServiceHealth
set SERVICE_NAME=%~1
set SERVICE_URL=%~2
echo.
echo Checking %SERVICE_NAME% service at %SERVICE_URL%...
echo Checking %SERVICE_NAME% service at %SERVICE_URL%... >> "%LOG_FILE%"

REM Try root health endpoint first (standard for most services)
curl -s -f "%SERVICE_URL%/health" > nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo %SERVICE_NAME% is running - Root Health check passed [OK]
    echo %SERVICE_NAME% is running - Root Health check passed [OK] >> "%LOG_FILE%"
    set SERVICE_RUNNING=1
    exit /b 0
)

REM If root health endpoint fails, try api health endpoint as fallback
curl -s -f "%SERVICE_URL%/api/health" > nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo %SERVICE_NAME% is running - API Health check passed [OK]
    echo %SERVICE_NAME% is running - API Health check passed [OK] >> "%LOG_FILE%"
    set SERVICE_RUNNING=1
    exit /b 0
) else (
    echo %SERVICE_NAME% is not running or not healthy [FAIL]
    echo %SERVICE_NAME% is not running or not healthy [FAIL] >> "%LOG_FILE%"
    set SERVICE_RUNNING=0
    exit /b 1
)
goto :EOF

REM Function to start a service using docker-compose
:StartDockerService
set SERVICE_NAME=%~1
set SERVICE_DIR=%~2
set WAIT_FOR_STARTUP=%~3

echo.
echo Starting %SERVICE_NAME% service...
echo Starting %SERVICE_NAME% service... >> "%LOG_FILE%"

if exist "%SERVICE_DIR%\docker-compose.yml" (
    REM Change to the service directory
    pushd "%SERVICE_DIR%"
    
    REM Check for any running containers with the same name to avoid conflicts
    for /f "tokens=*" %%a in ('docker ps -q --filter "name=%SERVICE_NAME%-service"') do (
        echo Found existing %SERVICE_NAME% container, stopping it...
        echo Found existing %SERVICE_NAME% container, stopping it... >> "%LOG_FILE%"
        docker stop %%a > nul 2>&1
    )
    
    REM Start the service using Docker Compose
    echo Running docker-compose up in %SERVICE_DIR%
    echo Running docker-compose up in %SERVICE_DIR% >> "%LOG_FILE%"
    
    if "%WAIT_FOR_STARTUP%" == "true" (
        docker-compose up -d
        echo Waiting for %SERVICE_NAME% to start...
        echo Waiting for %SERVICE_NAME% to start... >> "%LOG_FILE%"
        timeout /t 15 /nobreak > nul
    ) else (
        start /b cmd /c "docker-compose up -d"
    )
    
    echo %SERVICE_NAME% service started successfully
    echo %SERVICE_NAME% service started successfully >> "%LOG_FILE%"
    
    REM Return to the original directory
    popd
) else (
    echo docker-compose.yml not found in %SERVICE_DIR%
    echo docker-compose.yml not found in %SERVICE_DIR% >> "%LOG_FILE%"
    echo Cannot start %SERVICE_NAME% service
    echo Cannot start %SERVICE_NAME% service >> "%LOG_FILE%"
    exit /b 1
)
goto :EOF