@echo off
echo Building Simple Path Tool API...

docker build -t simple-path-tool .

if %ERRORLEVEL% EQU 0 (
    echo Build successful!
    echo.
    echo To run the container:
    echo   docker run -p 8000:8000 simple-path-tool
    echo.
    echo Or use docker-compose:
    echo   docker-compose up
    echo.
    echo API will be available at: http://localhost:8000
) else (
    echo Build failed!
    exit /b 1
)