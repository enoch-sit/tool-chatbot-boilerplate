@echo off
echo Starting mimicAzure service with HTTPS support...

REM Check if certificates exist
if not exist "certs\server.key" (
    echo ⚠️  SSL certificates not found!
    echo Generating certificates first...
    call npm run generate-certs
    if %errorlevel% neq 0 (
        echo ❌ Failed to generate certificates!
        echo Please install mkcert or OpenSSL and try again.
        pause
        exit /b %errorlevel%
    )
)

echo Building and starting HTTPS server...
npm run start:https
