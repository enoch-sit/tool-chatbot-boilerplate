@echo off
echo Rebuilding Docker containers and removing volumes...
echo.

echo Step 1: Stopping and removing containers...
docker-compose down

echo.
echo Step 2: Removing volumes...
docker-compose down -v

echo.
echo Step 3: Removing dangling images...
docker image prune -f

echo.
echo Step 4: Building and starting containers with fresh build...
docker-compose up --build -d

echo.
echo Step 5: Checking container status...
docker-compose ps

echo.
echo Step 6: Checking logs (last 20 lines)...
docker-compose logs --tail=20

echo.
echo ✅ Docker rebuild complete!
echo.
echo To view logs in real-time, run: docker-compose logs -f
echo To stop containers, run: docker-compose down
echo.
pause
