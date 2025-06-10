@echo off
REM Start Flowise Proxy Service with Test Environment Configuration
echo ======================================================
echo STARTING FLOWISE PROXY SERVICE FOR TESTING
echo Using test environment configuration (.env.test)
echo ======================================================

echo.
echo Setting environment variables for test...
set MONGODB_URL=mongodb://admin:password@localhost:27020/flowise_proxy_test
set MONGODB_DATABASE_NAME=flowise_proxy_test
set DEBUG=true
set PORT=8000

echo.
echo Starting Flowise Proxy Service...
cd /d "%~dp0"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --env-file .env.test

pause
