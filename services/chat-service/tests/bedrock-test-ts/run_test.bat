@echo off
echo ===================================================
echo AWS Bedrock Credentials and Model Access Test
echo ===================================================
echo.

echo Step 1: Checking for .env file...
if not exist .env (
  echo ERROR: .env file not found!
  echo.
  echo Please create a .env file with the following content:
  echo AWS_REGION=us-east-1
  echo AWS_ACCESS_KEY_ID=your_access_key_id
  echo AWS_SECRET_ACCESS_KEY=your_secret_access_key
  echo.
  echo Press any key to exit...
  pause > nul
  exit /b 1
) else (
  echo .env file found.
)

echo.
echo Step 2: Building Docker image...
docker build -t bedrock-test-ts .

echo.
echo Step 3: Running AWS Bedrock credential test...
docker run --rm -v %cd%\.env:/app/.env bedrock-test-ts

echo.
echo Test completed. Press any key to exit...
pause > nul