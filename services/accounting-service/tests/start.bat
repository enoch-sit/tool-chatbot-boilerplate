@echo off
REM This script activates the virtual environment and runs the workflow tests

echo Activating virtual environment...
cd /d "%~dp0"
call venv\Scripts\activate.bat

echo.
echo === Available Test Scripts ===
echo 1. Run full workflow test (all services)
echo 2. Run Auth-Accounting workflow test only
echo 3. Exit
echo.

set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" (
    echo.
    echo Running full workflow test...
    python workflow_test.py --all
) else if "%choice%"=="2" (
    echo.
    echo Running Auth-Accounting workflow test...
    python workflow_test_Auth_Acc.py
) else if "%choice%"=="3" (
    echo Exiting...
    exit /b 0
) else (
    echo Invalid choice. Please run the script again.
    exit /b 1
)

echo.
echo Test complete.
pause