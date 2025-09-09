@echo off
echo 🔧 Rebuilding and restarting HTTPS server with debug logging...

echo.
echo 📦 Building TypeScript...
call npm run build:https
if %errorlevel% neq 0 (
    echo ❌ Build failed!
    pause
    exit /b %errorlevel%
)

echo.
echo 🚀 Starting HTTPS server with enhanced logging...
echo 💡 All requests will be logged in detail
echo 💡 Use Ctrl+C to stop the server
echo.
node dist/server-https.js
