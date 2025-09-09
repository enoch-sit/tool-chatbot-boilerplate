@echo off

echo Stopping main Docker Compose services and removing volumes...
docker-compose -f docker-compose.yml down --volumes

echo.
echo Ensuring any previous debug PostgreSQL service is stopped and its volume removed...
docker-compose -f docker-compose.debug.yml down --volumes

echo.
echo Starting PostgreSQL service from docker-compose.debug.yml in detached mode...
docker-compose -f docker-compose.debug.yml up -d postgres

IF ERRORLEVEL 1 (
    echo Failed to start PostgreSQL service from docker-compose.debug.yml.
    GOTO :EOF
)

echo.
echo Waiting a few seconds for the PostgreSQL container to initialize...
timeout /t 5 /nobreak >nul

echo.
echo Fetching PostgreSQL container ID...
FOR /F "tokens=*" %%i IN ('docker-compose -f docker-compose.debug.yml ps -q postgres') DO SET POSTGRES_CONTAINER_ID=%%i

IF "%POSTGRES_CONTAINER_ID%"=="" (
    echo Failed to get PostgreSQL container ID.
    echo Please check 'docker ps' to see if the container is running under a different name or if it failed to start.
    echo You might need to adjust the script if the project name causes a different container name prefix.
    GOTO :EOF
)

echo.
echo Tailing logs for PostgreSQL container: %POSTGRES_CONTAINER_ID%
echo (Press Ctrl+C to stop logging)
docker logs -f %POSTGRES_CONTAINER_ID%

:EOF
echo.
echo Script finished.
