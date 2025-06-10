@echo off
REM Rebuild Test Database for VS Code Launch Configuration
REM This script rebuilds the test MongoDB container for VS Code debugging

echo ======================================================
echo REBUILDING TEST DATABASE FOR VS CODE DEBUGGING
echo This will reset the test MongoDB container on port 27020
echo ======================================================

echo.
echo Stopping existing test containers...
docker-compose -f docker-compose.test.yml down --volumes --remove-orphans

echo.
echo Removing test volumes...
docker volume rm flowise-proxy-service-py_mongodb_test_data 2>nul

echo.
echo Rebuilding test containers...
docker-compose -f docker-compose.test.yml build --no-cache

echo.
echo Starting test MongoDB container...
docker-compose -f docker-compose.test.yml up -d

echo.
echo Waiting for MongoDB to initialize...
timeout /t 10 /nobreak >nul

echo.
echo Testing MongoDB connection...
docker exec mongodb-test mongosh --eval "db.runCommand('ping')" 2>nul
if %errorlevel% equ 0 (
    echo ✅ MongoDB test container is ready!
    echo ✅ Connection: mongodb://admin:password@localhost:27020/flowise_proxy_test
) else (
    echo ❌ MongoDB test container failed to start properly
    echo Please check the container logs: docker logs mongodb-test
)

echo.
echo ======================================================
echo Test database rebuild completed!
echo You can now use VS Code debugger with the test configuration.
echo MongoDB is available on port 27020 with credentials:
echo   Username: admin
echo   Password: password
echo   Database: flowise_proxy_test
echo ======================================================
pause
