@echo off
echo Compiling TypeScript AWS credentials test...

cd ..
rem First compile using the project's tsconfig.json
call npx tsc -p .

echo.
echo Running AWS Credentials and Model Access Tests...
node dist/tests/aws_credentials_test.js

echo.
echo Test completed. Press any key to exit.
pause > nul