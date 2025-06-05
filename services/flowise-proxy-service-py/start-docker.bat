@echo off
echo Starting Docker containers...
echo.

echo Step 1: Starting containers in detached mode...
docker-compose up -d

echo.
echo Step 2: Checking container status...
docker-compose ps

echo.
echo Step 3: Checking recent logs...
docker-compose logs --tail=10

echo.
echo ✅ Docker containers started!
echo.
echo Useful commands:
echo   - View logs in real-time: docker-compose logs -f
echo   - Stop containers: docker-compose down
echo   - Restart containers: docker-compose restart
echo.
echo Services should be available at:
echo   - Flowise Proxy: http://localhost:8000
echo   - MongoDB: localhost:27019
echo.
pause
