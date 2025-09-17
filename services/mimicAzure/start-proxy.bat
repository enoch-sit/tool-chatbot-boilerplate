@echo off
echo Loading environment from .env.proxy...

REM Read environment variables from .env.proxy
for /f "usebackq tokens=1,2 delims==" %%a in (".env.proxy") do (
    if not "%%a"=="" if not "%%a"=="#" (
        set "%%a=%%b"
        echo Set %%a=%%b
    )
)

echo.
echo Starting server with proxy configuration...
npm run build:https && node dist/server-https.js
