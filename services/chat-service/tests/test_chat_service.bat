@echo off
echo ===================================
echo Running Chat Service Test Script
echo ===================================

:: Check if venv exists
if not exist venv\ (
    echo Virtual environment not found.
    echo Please run install.bat first.
    pause
    exit /b 1
)

:: Activate venv and run test script
echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Running tests...
python test_chat_service.py

echo ===================================
echo Test execution completed
echo ===================================

pause