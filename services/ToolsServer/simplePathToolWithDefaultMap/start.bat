@echo off
echo Starting Simple Path Tool API with Docker Compose...

docker-compose up -d

if %ERRORLEVEL% EQU 0 (
    echo Container started successfully!
    echo.
    echo API is available at: http://localhost:8000
    echo Health check: http://localhost:8000/health
    echo Documentation: http://localhost:8000/docs
    echo.
    echo To view logs: docker-compose logs -f
    echo To stop: docker-compose down
) else (
    echo Failed to start container!
    exit /b 1
)