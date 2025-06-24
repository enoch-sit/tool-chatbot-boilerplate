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
echo Checking test container status...
docker-compose -f docker-compose.test.yml ps

echo.
echo Displaying recent logs for the test server...
docker-compose -f docker-compose.test.yml logs --tail=20 flowise-proxy-test

echo.
echo ======================================================
echo ======================================================
pause
