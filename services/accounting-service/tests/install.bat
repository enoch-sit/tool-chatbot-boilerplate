@echo off
REM This script creates a virtual environment and installs required packages for workflow testing

echo Creating virtual environment in tests folder...
cd /d "%~dp0"

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating new Python virtual environment...
    python -m venv venv
    echo Virtual environment created.
) else (
    echo Virtual environment already exists.
)

REM Activate virtual environment and install packages
echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing required packages...
pip install requests aiohttp colorama tqdm

echo Setup complete! Use start.bat to run the tests.
echo.
pause