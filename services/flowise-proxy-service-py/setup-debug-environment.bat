@echo off
REM Setup Collections for VS Code Debugging Environment
REM This script prepares collections for use with VS Code debugger using .env.test

echo.
echo ========================================
echo   VS Code Debug Collection Setup  
echo ========================================
echo.

REM Check if test database is running
echo 🔍 Checking if test database is running...
docker ps --filter "name=mongodb-test" --filter "status=running" --format "{{.Names}}" | findstr mongodb-test >nul
if errorlevel 1 (
    echo ❌ MongoDB test container is not running
    echo Please run: rebuild-docker-dbonly.bat first
    pause
    exit /b 1
)

echo ✅ MongoDB test container is running

REM Test database connection
echo 🔍 Testing database connection...
docker exec mongodb-test mongosh --eval "db.runCommand('ping')" --quiet >nul 2>&1
if errorlevel 1 (
    echo ❌ Cannot connect to test database
    echo Please check if MongoDB test container is healthy
    pause
    exit /b 1
)

echo ✅ Database connection successful

REM Check if Python environment is ready
echo 🔍 Checking Python environment...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not available
    echo Please ensure Python is installed and in PATH
    pause
    exit /b 1
)

echo ✅ Python environment ready

REM Load environment from .env.test and run collection setup
echo 🗄️ Setting up collections using .env.test configuration...
echo.

REM Set environment variables from .env.test for this session
for /f "usebackq tokens=1,2 delims==" %%i in (".env.test") do (
    set "line=%%i"
    if not "!line:~0,1!"=="#" if not "%%i"=="" set "%%i=%%j"
)

REM Run the collection setup test
python test_collection_setup.py
if errorlevel 1 (
    echo.
    echo ❌ Collection setup failed
    echo Check the error messages above for details
    pause
    exit /b 1
)

echo.
echo ✅ Collection setup completed successfully!
echo.
echo ========================================
echo   VS Code Debug Environment Ready!
echo ========================================
echo.
echo 🎯 What's ready:
echo   • MongoDB test database running on localhost:27020
echo   • All collections created and indexed
echo   • GridFS configured for file storage
echo   • Environment variables loaded from .env.test
echo.
echo 🚀 You can now start debugging with VS Code:
echo   • Use "Debug Admin API (Uvicorn CLI - DEBUG Level)" configuration
echo   • Access API at: http://localhost:8000
echo   • Health check: http://localhost:8000/health
echo   • Collections status: http://localhost:8000/collections/status
echo.
echo ========================================

pause
