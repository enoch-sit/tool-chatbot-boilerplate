@echo off
echo ======================================================
echo Running Database Migrations for Test Environment
echo ======================================================

echo Checking if MongoDB test container is running...
docker ps | findstr mongodb-test
if errorlevel 1 (
    echo ERROR: mongodb-test container is not running
    echo Please run rebuild-docker-dbonly.bat first
    pause
    exit /b 1
)

echo.
echo Testing MongoDB connection...
docker exec mongodb-test mongosh --eval "db.runCommand('ping')" --quiet
if errorlevel 1 (
    echo ERROR: MongoDB is not ready
    pause
    exit /b 1
)

echo MongoDB is ready!

echo.
echo Running database migrations...
python migrations\run_migrations.py --all

if errorlevel 1 (
    echo ERROR: Migration failed
    pause
    exit /b 1
)

echo.
echo ======================================================
echo Migration completed successfully!
echo ======================================================
pause
