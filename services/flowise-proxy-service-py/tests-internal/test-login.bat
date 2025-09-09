@echo off
REM Batch script to run the test-login.py script

REM Get the directory of the batch script
SET SCRIPT_DIR=%~dp0

REM Define the path to the Python script
SET PYTHON_SCRIPT_PATH=%SCRIPT_DIR%test-login.py

REM Define the path to the Python interpreter (assuming python is in PATH)
SET PYTHON_EXE=python

REM Check if the Python script exists
IF NOT EXIST "%PYTHON_SCRIPT_PATH%" (
    echo ERROR: Python script not found at %PYTHON_SCRIPT_PATH%
    exit /b 1
)

REM Run the Python script with default host and port, and include invalid credential tests
REM You can modify the arguments as needed:
REM   --host <hostname>  (default: localhost)
REM   --port <port_number> (default: 8000)
REM   --test-invalid       (include tests for invalid credentials)

echo Running Login Test Script...
%PYTHON_EXE% "%PYTHON_SCRIPT_PATH%" --host localhost --port 8000 --test-invalid

REM Check the exit code of the Python script
IF ERRORLEVEL 1 (
    echo.
    echo Login Test Script FAILED
) ELSE (
    echo.
    echo Login Test Script PASSED
)

exit /b %ERRORLEVEL%
