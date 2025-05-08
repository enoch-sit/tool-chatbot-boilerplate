@echo off
REM test_chat_service.bat
echo ===================================
echo Chat Service Test Script
echo ===================================

REM Check if Python is installed
python --version > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Python is not installed or not in PATH. Please install Python 3.8 or newer.
    echo Press any key to continue...
    pause > nul
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('python --version') do set pythonVersion=%%i
    echo Found Python: %pythonVersion%
)

REM Check and start required services
echo.
echo Checking if required services are running...
call "%~dp0..\..\..\Tests\check_and_start_services.bat"
if %ERRORLEVEL% NEQ 0 (
    echo Failed to start all required services. Cannot proceed with tests.
    echo Press any key to continue...
    pause > nul
    exit /b 1
)

echo All required services are running. Proceeding with tests...
echo.

REM Check if venv exists, if not create it
if not exist "venv" (
    echo Virtual environment not found. Creating new virtual environment...
    python -m venv venv
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to create virtual environment. Please check your Python installation.
        echo Press any key to continue...
        pause > nul
        exit /b 1
    )
    echo Virtual environment created successfully.
)

REM Activate venv
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Check if requirements are installed
set requirementsFile=requirements.txt

REM Try importing key packages to check if requirements are installed
python -c "import requests, colorama, aiohttp, sseclient" > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Installing required packages...
    
    REM Check if requirements.txt exists
    if not exist "%requirementsFile%" (
        echo Creating requirements.txt with necessary packages...
        echo requests>%requirementsFile%
        echo colorama>>%requirementsFile%
        echo aiohttp>>%requirementsFile%
        echo sseclient-py>>%requirementsFile%
    )
    
    python -m pip install --upgrade pip
    python -m pip install -r %requirementsFile%
    
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to install required packages. See error messages above.
        echo Press any key to continue...
        pause > nul
        exit /b 1
    )
    echo Required packages installed successfully.
) else (
    echo Required packages already installed.
)

REM Run the test script
echo Running tests...
python test_chat_service.py

REM Check test result
if %ERRORLEVEL% EQU 0 (
    echo ===================================
    echo Tests completed successfully!
    echo ===================================
) else (
    echo ===================================
    echo Tests failed with exit code %ERRORLEVEL%
    echo ===================================
)

echo Press any key to continue...
pause > nul