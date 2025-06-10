@echo off
echo ======================================================
echo WARNING: This will DELETE ALL TEST VOLUME DATA including test databases!
echo This action cannot be undone.
echo ======================================================
set /p confirm="Are you sure you want to continue? (yes/no): "
if not "%confirm%"=="yes" (
    echo Operation cancelled.
    exit /b 0
)

echo.
echo Stopping and removing existing test containers, networks, and volumes...
docker-compose -f docker-compose.test.yml down --volumes --remove-orphans

echo.
echo Removing test Docker volumes (this will delete all test persistent data)...
for /f "tokens=*" %%i in ('docker volume ls -q ^| findstr flowise-proxy-service-py') do docker volume rm %%i 2>nul

echo.
echo Removing unused Docker networks...
docker network prune -f

echo.
echo Rebuilding test Docker images without cache...
docker-compose -f docker-compose.test.yml build --no-cache

echo.
echo Starting test services in detached mode...
docker-compose -f docker-compose.test.yml up -d

echo.
echo Waiting for MongoDB test container to be ready...
timeout /t 5 /nobreak >nul

echo.
echo Testing MongoDB connection...
docker exec mongodb-test mongosh --eval "db.runCommand('ping')" --quiet

echo.
echo ======================================================
echo Test Docker rebuild with volume reset completed.
echo All previous test data has been cleared.
echo Test services are ready for use.
echo.
echo MongoDB Test Connection: mongodb://admin:password@localhost:27020
echo Database: flowise_proxy_test
echo.
echo You can now run the VS Code debugger with "Python Debugger: FastAPI (Test DB)"
echo ======================================================
pause
