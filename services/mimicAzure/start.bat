@echo off
echo Building and starting MimicAzure service...
npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    exit /b %errorlevel%
)
echo Starting server...
npm start
