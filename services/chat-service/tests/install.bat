@echo off
echo ===================================
echo Installing Chat Service Test Environment
echo ===================================

:: Check if Python is installed
python --version > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Python is not installed or not in PATH. Please install Python and try again.
    exit /b 1
)

:: Check if venv already exists
if exist venv\ (
    echo Virtual environment already exists.
    echo To recreate, delete the venv folder and run this script again.
) else (
    echo Creating virtual environment...
    python -m venv venv
)

:: Activate venv and install dependencies
echo Activating virtual environment and installing dependencies...
call venv\Scripts\activate.bat
pip install requests sseclient-py

echo ===================================
echo Installation complete!
echo ===================================
echo To run tests: test_chat_service.bat
echo ===================================

pause