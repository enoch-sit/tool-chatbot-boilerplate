@echo off
echo ==========================================
echo Flowise SDK Test Runner
echo ==========================================
echo.

cd /d "%~dp0"

echo [1/4] Running Flowise API Pre-Test...
python mimic_client_10_pre_flowiseapi_test.py
if %errorlevel% neq 0 (
    echo ERROR: Pre-test failed!
    pause
    exit /b 1
)

echo.
echo [2/4] Running Flowise SDK Direct Test...
python mimic_client_10_flowise_sdk_test.py
if %errorlevel% neq 0 (
    echo ERROR: SDK test failed!
    pause
    exit /b 1
)

echo.
echo [3/4] Running Flowise Requests-Only Test...
python mimic_client_10_requests_only_test.py
if %errorlevel% neq 0 (
    echo ERROR: Requests test failed!
    pause
    exit /b 1
)

echo.
echo [4/4] Running Image Upload Test via Proxy...
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
