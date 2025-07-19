@echo off
REM Setup Collections for File System - Windows Batch Script
REM This script sets up the MongoDB collections required for file system support

echo.
echo ========================================
echo   Collection Setup for File System
echo ========================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python and try again.
    pause
    exit /b 1
)

REM Check if we're in the correct directory
if not exist "app\main.py" (
    echo ❌ Error: app\main.py not found
    echo Please run this script from the flowise-proxy-service-py directory
    pause
    exit /b 1
)

echo ✅ Python found
echo ✅ Correct directory detected
echo.

REM Ask user for setup options
echo Setup Options:
echo.
echo 1. Test collection setup (recommended first)
echo 2. Setup collections (normal setup)
echo 3. Force recreate collections (destructive)
echo 4. Check collection status only
echo.

set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    echo.
    echo 🧪 Running collection setup tests...
    echo.
    python test_collection_setup.py
    goto :end
)

if "%choice%"=="2" (
    echo.
    echo 🗄️ Setting up collections for file system...
    echo.
    python -c "import asyncio; import sys; sys.path.insert(0, 'app'); from app.services.collection_setup_service import setup_collections_for_file_system; exit(0 if asyncio.run(setup_collections_for_file_system()) else 1)"
    goto :end
)

if "%choice%"=="3" (
    echo.
    echo ⚠️  WARNING: This will recreate all collections and may cause data loss!
    set /p confirm="Are you sure? Type 'YES' to continue: "
    if not "%confirm%"=="YES" (
        echo Operation cancelled.
        goto :end
    )
    echo.
    echo 🔄 Force recreating collections...
    echo.
    python -c "import asyncio; import sys; sys.path.insert(0, 'app'); from app.services.collection_setup_service import setup_collections_for_file_system; exit(0 if asyncio.run(setup_collections_for_file_system(force_recreate=True)) else 1)"
    goto :end
)

if "%choice%"=="4" (
    echo.
    echo 🔍 Checking collection status...
    echo.
    python -c "import asyncio; import sys; sys.path.insert(0, 'app'); from app.database import connect_to_mongo, close_mongo_connection, get_database; from app.services.collection_setup_service import collection_setup_service; async def check(): await connect_to_mongo(); status = await collection_setup_service.health_check(); print('Collection Status:'); import json; print(json.dumps(status, indent=2, default=str)); await close_mongo_connection(); asyncio.run(check())"
    goto :end
)

echo ❌ Invalid choice. Please select 1-4.

:end
echo.
echo ========================================
echo Setup complete. Check the output above for any errors.
echo.
if exist "collection_setup_report.json" (
    echo 📊 Setup report saved to: collection_setup_report.json
)
if exist "collection_setup_test_report_*.json" (
    echo 📊 Test report saved to: collection_setup_test_report_*.json
)
echo.
pause
