@echo off
echo Building and running AWS Bedrock Test in Docker...
echo.
echo Step 1: Building Docker image
docker-compose build

echo.
echo Step 2: Running AWS Bedrock test
docker-compose up

echo.
echo Test execution complete.
echo Press any key to exit...
pause > nul