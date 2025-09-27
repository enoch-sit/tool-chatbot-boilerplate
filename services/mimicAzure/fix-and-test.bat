@echo off
echo.
echo ========================================
echo  🔧 mimicAzure Server Issue Fix
echo ========================================
echo.

echo 📋 Step 1: Stopping any existing server processes...
taskkill /f /im node.exe >nul 2>&1
echo    ✅ Cleaned up existing processes

echo.
echo 📋 Step 2: Rebuilding the server with environment support...
call npm run build:http
if errorlevel 1 (
    echo    ❌ Build failed
    pause
    exit /b 1
)
echo    ✅ Server rebuilt successfully

echo.
echo 📋 Step 3: Starting server with proper environment configuration...
echo    🚀 Starting HTTP server on port 5555 with proxy enabled...
echo    📝 Check the console output for proxy configuration

start "mimicAzure HTTP Server" cmd /c "npm run dev && pause"

echo.
echo 📋 Step 4: Waiting for server to start...
timeout /t 10 /nobreak >nul

echo.
echo 📋 Step 5: Running the enhanced test...
echo    🧪 This test will now auto-detect HTTP vs HTTPS and proper ports
echo.

node test-nonstream-proxy.js

echo.
echo ========================================
echo  🎯 Test completed!
echo ========================================
echo.
echo 💡 If the test still fails, verify these:
echo    1. Server window shows "USE_EDUHK_PROXY: true"
echo    2. EdUHK API key is valid in .env file
echo    3. No firewall blocking ports 5555/5556
echo.
pause