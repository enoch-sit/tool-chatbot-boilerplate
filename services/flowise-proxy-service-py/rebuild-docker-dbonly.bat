@echo off
echo ======================================================
echo WARNING: This will DELETE ALL TEST DB VOLUME DATA!
echo This action cannot be undone.
echo ======================================================
set /p confirm="Are you sure you want to continue? (yes/no): "
if not "%confirm%"=="yes" (
    echo Operation cancelled.
    exit /b 0
)

echo.
echo Stopping and removing existing test containers, networks, and volumes...
docker-compose -f docker-compose.dbonly.yml down --volumes --remove-orphans

echo.
echo Removing test Docker volumes (this will delete all test persistent data)...
for /f "tokens=*" %%i in ('docker volume ls -q ^| findstr flowise-proxy-service-py') do docker volume rm %%i 2>nul

echo.
echo Removing unused Docker networks...
docker network prune -f

echo.
echo Starting test services in detached mode...
docker-compose -f docker-compose.dbonly.yml up -d

echo.
echo Waiting for MongoDB test container to be ready...
timeout /t 5 /nobreak >nul

echo.
echo Testing MongoDB connection...
docker exec mongodb-test mongosh --eval "db.runCommand('ping')" --quiet

echo.
echo ======================================================
echo DB Only Docker rebuild with volume reset completed.
echo All previous test data has been cleared.
echo Test DB is ready for use.
echo.
echo MongoDB Test Connection: mongodb://admin:password@localhost:27020
echo Database: flowise_proxy_test
echo.
echo You can now run the VS Code debugger with "Python Debugger: FastAPI (Test DB)"
echo ======================================================

echo.
set /p run_migration="Do you want to run database migrations now? (yes/no): "
if "%run_migration%"=="yes" (
    echo.
    echo Running database migrations...
    python migrations\run_migrations.py --all
    if errorlevel 1 (
        echo ERROR: Migration failed
        pause
        exit /b 1
    )
    echo Migration completed successfully!
)

echo.
set /p setup_collections="Do you want to setup collections for file system now? (yes/no): "
if "%setup_collections%"=="yes" (
    echo.
    echo Setting up collections for file system...
    python test_collection_setup.py
    if errorlevel 1 (
        echo ERROR: Collection setup failed
        pause
        exit /b 1
    )
    echo Collection setup completed successfully!
    echo.
    echo ✅ Database is now ready for VS Code debugging with file system support!
)
pause
