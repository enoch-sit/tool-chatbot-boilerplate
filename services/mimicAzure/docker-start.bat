@echo off
echo Starting mimicAzure service with Docker Compose...
docker-compose up -d
if %errorlevel% neq 0 (
    echo Failed to start service!
    exit /b %errorlevel%
)
echo Service started successfully on port 5555!
echo Test with: http://localhost:5555
