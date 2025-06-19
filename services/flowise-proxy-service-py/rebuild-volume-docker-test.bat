@echo off
echo Rebuilding Docker volume test environment...
echo.

echo Step 1: Stopping and removing containers, networks, and volumes...
docker compose -f docker-compose.test.yml down -v

echo.
echo Step 2: Rebuilding and starting fresh...
docker compose -f docker-compose.test.yml up -d

echo.
echo Rebuild complete! Checking container status...
docker ps

echo.
echo To check MongoDB connection, run:
echo docker exec -it mongodb-test mongosh --eval "db.runCommand('ping')"
pause