@echo off
REM test_chat_service.bat - Comprehensive test script for chat service
echo ===================================
echo Chat Service Test Script
echo ===================================

REM Define service URLs
set AUTH_SERVICE_URL=http://localhost:3000
set ACCOUNTING_SERVICE_URL=http://localhost:3001
set CHAT_SERVICE_URL=http://localhost:3002

REM Set paths
set ROOT_DIR=%~dp0..
set AUTH_DIR=%ROOT_DIR%\services\authentication-service
set ACCOUNTING_DIR=%ROOT_DIR%\services\accounting-service
set CHAT_DIR=%ROOT_DIR%\services\chat-service
set RESULTS_DIR=%~dp0results

REM Create timestamp for the result file
for /f "tokens=1-5 delims=/ " %%d in ("%date%") do (
    set datestamp=%%f-%%e-%%d
)
for /f "tokens=1-3 delims=: " %%a in ("%time%") do (
    set timestamp=%%a-%%b-%%c
)
set timestamp=%timestamp:.=-%
set RESULT_FILE=%RESULTS_DIR%\test_results_%datestamp%_%timestamp%.txt

REM Create results directory if it doesn't exist
if not exist "%RESULTS_DIR%" (
    mkdir "%RESULTS_DIR%"
    echo Created results directory: %RESULTS_DIR%
)

REM Start logging to file
echo ===================================>> "%RESULT_FILE%"
echo Chat Service Test Results>> "%RESULT_FILE%"
echo Date: %date% Time: %time%>> "%RESULT_FILE%"
echo ===================================>> "%RESULT_FILE%"
echo.>> "%RESULT_FILE%"

echo Results will be saved to: %RESULT_FILE%
echo.

echo Checking if Docker is running...
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Docker is not running. Please start Docker before continuing.>> "%RESULT_FILE%"
    echo.>> "%RESULT_FILE%"
    echo ERROR: Docker is not running. Please start Docker before continuing.
    echo.
    echo Press any key to exit...
    pause > nul
    exit /b 1
) else (
    echo Docker is running.>> "%RESULT_FILE%"
    echo Docker is running.
)

REM Run the service check and startup script first
echo.>> "%RESULT_FILE%"
echo Running service health check and startup...>> "%RESULT_FILE%"
echo.
echo Running service health check and startup...
call "%~dp0check_and_start_services.bat"
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to ensure all services are running.>> "%RESULT_FILE%"
    echo Please check the error messages above.>> "%RESULT_FILE%"
    echo.>> "%RESULT_FILE%"
    echo ERROR: Failed to ensure all services are running.
    echo Please check the error messages above.
    echo.
    echo Press any key to exit...
    pause > nul
    exit /b 1
)

REM Double-check Accounting Service specifically since that's the one causing issues
echo.>> "%RESULT_FILE%"
echo Specifically checking Accounting Service health...>> "%RESULT_FILE%"
echo.
echo Specifically checking Accounting Service health...

REM Try the root health endpoint first since that's the correct one
curl -s -o nul -w "%%{http_code}" %ACCOUNTING_SERVICE_URL%/health > temp_status.txt
set /p acc_status=<temp_status.txt
del temp_status.txt

if "%acc_status%"=="200" (
    echo Accounting Service: Running via root health check>> "%RESULT_FILE%"
    echo Accounting Service: Running via root health check
    goto accounting_health_ok
)

REM If root health endpoint fails, try API health as fallback (though it shouldn't be needed)
curl -s -o nul -w "%%{http_code}" %ACCOUNTING_SERVICE_URL%/api/health > temp_status.txt
set /p acc_status=<temp_status.txt
del temp_status.txt

if "%acc_status%"=="200" (
    echo Accounting Service: Running via API health check>> "%RESULT_FILE%"
    echo Accounting Service: Running via API health check
    goto accounting_health_ok
) else (
    echo Accounting Service: Not running>> "%RESULT_FILE%"
    echo.>> "%RESULT_FILE%"
    echo ERROR: The Accounting Service is not healthy even after attempting to start it.>> "%RESULT_FILE%"
    echo This might indicate a deeper issue with the service configuration.>> "%RESULT_FILE%"
    echo.>> "%RESULT_FILE%"
    echo Try these troubleshooting steps:>> "%RESULT_FILE%"
    echo 1. Check the Accounting Service logs: docker-compose logs accounting-service>> "%RESULT_FILE%"
    echo 2. Rebuild the Accounting Service: cd %ACCOUNTING_DIR% ^&^& rebuild-docker.bat>> "%RESULT_FILE%"
    echo 3. Check if there's a port conflict on 3001>> "%RESULT_FILE%"
    echo 4. Verify the database connection settings>> "%RESULT_FILE%"
    echo.>> "%RESULT_FILE%"

    echo Accounting Service: Not running
    echo.
    echo ERROR: The Accounting Service is not healthy even after attempting to start it.
    echo This might indicate a deeper issue with the service configuration.
    echo.
    echo Try these troubleshooting steps:
    echo 1. Check the Accounting Service logs: docker-compose logs accounting-service
    echo 2. Rebuild the Accounting Service: cd %ACCOUNTING_DIR% ^&^& rebuild-docker.bat
    echo 3. Check if there's a port conflict on 3001
    echo 4. Verify the database connection settings
    echo.
    echo Press any key to exit...
    pause > nul
    exit /b 1
)

:accounting_health_ok

REM Now we can continue with the chat service tests
echo.>> "%RESULT_FILE%"
echo ===================================>> "%RESULT_FILE%"
echo Running chat service tests>> "%RESULT_FILE%"
echo ===================================>> "%RESULT_FILE%"
echo.
echo ===================================
echo Running chat service tests
echo ===================================

REM Check if python is installed
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Python is not installed or not in PATH.>> "%RESULT_FILE%"
    echo Please install Python before running these tests.>> "%RESULT_FILE%"
    echo.>> "%RESULT_FILE%"
    
    echo ERROR: Python is not installed or not in PATH.
    echo Please install Python before running these tests.
    echo.
    echo Press any key to exit...
    pause > nul
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('python --version') do set pythonVersion=%%i
    echo Found Python: %pythonVersion%>> "%RESULT_FILE%"
    echo Found Python: %pythonVersion%
)

REM Make sure required Python packages are installed
echo Checking required Python packages...>> "%RESULT_FILE%"
echo Checking required Python packages...

REM Install all required packages at once
echo Installing required dependencies...>> "%RESULT_FILE%"
echo Installing required dependencies...
python -m pip install requests colorama aiohttp sseclient-py
echo Done installing dependencies.>> "%RESULT_FILE%"
echo Done installing dependencies.

REM Verify installations 
python -c "import requests, colorama, aiohttp, sseclient" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to install one or more required packages>> "%RESULT_FILE%"
    echo ERROR: Failed to install one or more required packages
    echo Press any key to exit...
    pause > nul
    exit /b 1
) else (
    echo Python dependencies installed successfully>> "%RESULT_FILE%"
    echo Python dependencies installed successfully
)

REM Find the test script
set TEST_SCRIPT=%CHAT_DIR%\tests\test_chat_service.py

if not exist "%TEST_SCRIPT%" (
    echo ERROR: Test script not found at: %TEST_SCRIPT%>> "%RESULT_FILE%"
    echo.>> "%RESULT_FILE%"
    
    echo ERROR: Test script not found at: %TEST_SCRIPT%
    echo.
    echo Press any key to exit...
    pause > nul
    exit /b 1
)

REM Run the python test script and capture output to the result file
echo.>> "%RESULT_FILE%"
echo Running chat service test script...>> "%RESULT_FILE%"
echo.>> "%RESULT_FILE%"

echo.
echo Running chat service test script...
echo.

REM Run the Python test and capture output in the result file
python "%TEST_SCRIPT%" > "%RESULT_FILE%.tmp" 2>&1
set TEST_EXIT_CODE=%ERRORLEVEL%

REM Display output to console and append to result file
type "%RESULT_FILE%.tmp"
type "%RESULT_FILE%.tmp" >> "%RESULT_FILE%"
del "%RESULT_FILE%.tmp"

echo.>> "%RESULT_FILE%"
if %TEST_EXIT_CODE% equ 0 (
    echo ===================================>> "%RESULT_FILE%"
    echo Tests completed successfully!>> "%RESULT_FILE%"
    echo ===================================>> "%RESULT_FILE%"
    
    echo.
    echo ===================================
    echo Tests completed successfully!
    echo ===================================
) else (
    echo ===================================>> "%RESULT_FILE%"
    echo Tests failed with exit code %TEST_EXIT_CODE%>> "%RESULT_FILE%"
    echo ===================================>> "%RESULT_FILE%"
    
    echo.
    echo ===================================
    echo Tests failed with exit code %TEST_EXIT_CODE%
    echo ===================================
)

echo.>> "%RESULT_FILE%"
echo Test results saved to: %RESULT_FILE%>> "%RESULT_FILE%"
echo.
echo Test results saved to: %RESULT_FILE%

echo.
echo Press any key to continue...
pause > nul