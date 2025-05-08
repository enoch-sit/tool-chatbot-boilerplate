@echo off
REM test_aws_bedrock.bat
echo ===================================
echo AWS Bedrock Credentials Test Script
echo ===================================

REM Setup directories
set ROOT_DIR=%~dp0..
set BEDROCK_TEST_DIR=%ROOT_DIR%\services\chat-service\tests\bedrock-test-ts
set RESULTS_DIR=%~dp0results

REM Create timestamp for the result file
for /f "tokens=1-5 delims=/ " %%d in ("%date%") do (
    set datestamp=%%f-%%e-%%d
)
for /f "tokens=1-3 delims=: " %%a in ("%time%") do (
    set timestamp=%%a-%%b-%%c
)
set timestamp=%timestamp:.=-%
set RESULT_FILE=%RESULTS_DIR%\aws_bedrock_test_%datestamp%_%timestamp%.txt

REM Create results directory if it doesn't exist
if not exist "%RESULTS_DIR%" (
    mkdir "%RESULTS_DIR%"
    echo Created results directory: %RESULTS_DIR%
)

echo.
echo Running AWS Bedrock test from %BEDROCK_TEST_DIR%
echo Results will be saved to: %RESULT_FILE%
echo.

REM Start logging to file
echo ===================================>> "%RESULT_FILE%"
echo AWS Bedrock Credentials Test Results>> "%RESULT_FILE%"
echo Date: %date% Time: %time%>> "%RESULT_FILE%"
echo ===================================>> "%RESULT_FILE%"
echo.>> "%RESULT_FILE%"

REM Check if the run_test.bat file exists
if not exist "%BEDROCK_TEST_DIR%\run_test.bat" (
    echo ERROR: run_test.bat not found at %BEDROCK_TEST_DIR%>> "%RESULT_FILE%"
    echo Please check if the bedrock-test-ts folder is in the correct location.>> "%RESULT_FILE%"
    echo.>> "%RESULT_FILE%"
    
    echo ERROR: run_test.bat not found at %BEDROCK_TEST_DIR%
    echo Please check if the bedrock-test-ts folder is in the correct location.
    echo.
    echo Press any key to exit...
    pause > nul
    exit /b 1
)

REM Run the existing test script and capture its output
echo Executing run_test.bat from %BEDROCK_TEST_DIR%...>> "%RESULT_FILE%"
echo.>> "%RESULT_FILE%"
echo Executing run_test.bat from %BEDROCK_TEST_DIR%...
echo.

REM Change to the test directory
pushd "%BEDROCK_TEST_DIR%"

REM Run the test script and capture output to a temporary file
echo ===== TEST EXECUTION OUTPUT =====>> "%RESULT_FILE%"
echo.>> "%RESULT_FILE%"

REM Create a temporary file to capture the output
set TEMP_OUTPUT=%TEMP%\aws_bedrock_test_output.txt
cmd /c run_test.bat > "%TEMP_OUTPUT%" 2>&1

REM Capture the error level
set TEST_RESULT=%ERRORLEVEL%

REM Display and save the output
type "%TEMP_OUTPUT%"
type "%TEMP_OUTPUT%" >> "%RESULT_FILE%"
del "%TEMP_OUTPUT%"

REM Return to original directory
popd

REM Print summary based on result
echo.>> "%RESULT_FILE%"
echo ===================================>> "%RESULT_FILE%"
echo AWS Bedrock Test Summary>> "%RESULT_FILE%"
echo ===================================>> "%RESULT_FILE%"
echo.>> "%RESULT_FILE%"

echo.
echo ===================================
echo AWS Bedrock Test Summary
echo ===================================
echo.

if %TEST_RESULT% equ 0 (
    echo AWS credentials test completed successfully.>> "%RESULT_FILE%"
    echo Your AWS Bedrock configuration appears to be working correctly.>> "%RESULT_FILE%"
    
    echo AWS credentials test completed successfully.
    echo Your AWS Bedrock configuration appears to be working correctly.
) else (
    echo AWS credentials test encountered issues.>> "%RESULT_FILE%"
    echo Please check the error messages above and verify your AWS credentials.>> "%RESULT_FILE%"
    
    echo AWS credentials test encountered issues.
    echo Please check the error messages above and verify your AWS credentials.
)

echo.>> "%RESULT_FILE%"
echo Test results saved to: %RESULT_FILE%>> "%RESULT_FILE%"

echo.
echo Test results saved to: %RESULT_FILE%
echo.
echo Press any key to exit...
pause > nul
exit /b %TEST_RESULT%