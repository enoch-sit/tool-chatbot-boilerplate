@echo off
echo =============================
echo AWS Bedrock Parser Test Suite
echo =============================

rem Set the current directory
cd /d "%~dp0"
echo Running tests from: %cd%

rem Check if tsc is available
where tsc >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo TypeScript compiler not found. Installing...
    call npm install -g typescript
)

rem Compile TypeScript files
echo.
echo Compiling TypeScript files...
call tsc -p parser-tsconfig.json

if %ERRORLEVEL% NEQ 0 (
    echo Failed to compile TypeScript files.
    exit /b 1
)

rem Run the basic parser test
echo.
echo.
echo Running basic parser test...
node ./dist/src/parsingTest/testResponseParser.js

rem Run the real samples test
echo.
echo.
echo Running real samples test...
node ./dist/src/parsingTest/testRealSamples.js

echo.
echo.
echo All tests completed.
pause