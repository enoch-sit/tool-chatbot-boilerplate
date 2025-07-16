@echo off
echo ==========================================
echo Flowise SDK Test Runner
echo ==========================================
echo.

cd /d "%~dp0"

echo [1/3] Running Flowise API Pre-Test...
python mimic_client_10_pre_flowiseapi_test.py
if %errorlevel% neq 0 (
    echo ERROR: Pre-test failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Running Flowise SDK Direct Test...
python mimic_client_10_flowise_sdk_test.py
if %errorlevel% neq 0 (
    echo ERROR: SDK test failed!
    pause
    exit /b 1
)

echo.
echo [3/3] Running Image Upload Test via Proxy...
python mimic_client_10_Imageupload_10.py
if %errorlevel% neq 0 (
    echo ERROR: Image upload test failed!
    pause
    exit /b 1
)

echo.
echo ==========================================
echo All tests completed successfully!
echo ==========================================
pause
