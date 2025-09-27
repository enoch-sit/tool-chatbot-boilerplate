@echo off
echo.
echo ========================================
echo  mimicAzure Non-Streaming Proxy Test
echo ========================================
echo.

REM Check if node is available
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: package.json not found
    echo Please run this script from the mimicAzure service directory
    echo Expected path: services\mimicAzure\
    pause
    exit /b 1
)

echo Checking dependencies...
if not exist "node_modules" (
    echo Installing npm dependencies...
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo.
echo Starting test...
echo.
node test-nonstream-proxy.js

echo.
echo Test completed. Press any key to exit...
pause >nul