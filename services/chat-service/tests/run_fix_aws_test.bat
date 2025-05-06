@echo off
echo Building and running AWS Bedrock Test in Docker...
echo.

echo Step 0: Creating a temporary tsconfig.json for Docker...
echo {> tsconfig.json
echo   "compilerOptions": {>> tsconfig.json
echo     "target": "es6",>> tsconfig.json
echo     "module": "commonjs",>> tsconfig.json
echo     "outDir": "./dist",>> tsconfig.json
echo     "rootDir": ".",>> tsconfig.json
echo     "strict": true,>> tsconfig.json
echo     "esModuleInterop": true>> tsconfig.json
echo   },>> tsconfig.json
echo   "include": ["./*.ts"]>> tsconfig.json
echo }>> tsconfig.json
echo Temporary tsconfig.json created.

echo Step 1: Check AWS credentials file exists...
if not exist ..\.env (
  echo ERROR: .env file not found in the parent directory.
  echo Please create a .env file with your AWS credentials:
  echo AWS_REGION=us-east-1
  echo AWS_ACCESS_KEY_ID=your_access_key_id
  echo AWS_SECRET_ACCESS_KEY=your_secret_access_key
  echo.
  goto :error
)

echo Step 2: Building Docker container...
docker-compose build

echo.
echo Step 3: Running AWS Bedrock test...
docker-compose up

echo.
echo Test execution complete.
goto :end

:error
echo.
echo Test setup failed. Please fix the errors above and try again.

:end
echo.
echo Press any key to exit...
pause > nul