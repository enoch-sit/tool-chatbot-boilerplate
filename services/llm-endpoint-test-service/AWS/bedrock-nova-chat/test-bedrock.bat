@echo off
echo ====================================
echo AWS Bedrock Nova Chat Test Automation
echo ====================================

echo Creating logs directory if it doesn't exist...
if not exist "test_logs" mkdir test_logs

echo Setting up timestamp for log files...
set timestamp=%date:~-4,4%-%date:~-10,2%-%date:~-7,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%
set timestamp=%timestamp: =0%
set logfile=test_logs\test-run-%timestamp%.log

echo Starting test run at %timestamp% > %logfile%

echo Installing dependencies...
echo Installing dependencies... >> %logfile%
call npm install >> %logfile% 2>&1
if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies. Check %logfile% for details.
    exit /b %errorlevel%
)

echo Compiling TypeScript...
echo Compiling TypeScript... >> %logfile%
call npx tsc >> %logfile% 2>&1
if %errorlevel% neq 0 (
    echo Error: TypeScript compilation failed. Check %logfile% for details.
    exit /b %errorlevel%
)

echo Creating test input file...
set testfile=test_inputs.txt
echo Creating test input file... >> %logfile%

(
echo Hello, can you introduce yourself?
echo What are your capabilities?
echo stream
echo Tell me a short story about AI and humans working together.
echo standard
echo How can I use AWS Bedrock in my applications?
echo quit
) > %testfile%

echo Running automated tests...
echo Running automated tests... >> %logfile%
echo.
echo Standard mode and streaming mode tests will be executed
echo Results are being logged to %logfile%
echo.

echo Test output: >> %logfile%
echo =========== >> %logfile%
type %testfile% | node dist/bedrock_nova_chat.js >> %logfile% 2>&1

echo Test run completed.
echo Results saved to %logfile%
echo.

echo ====================================
echo Test Summary
echo ====================================
echo The following tests were performed:
echo - Standard mode: Basic query and response
echo - Stream mode: Streaming response for creative content
echo - API format validation
echo.
echo Check %logfile% for detailed results
echo ====================================