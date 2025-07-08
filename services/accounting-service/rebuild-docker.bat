@echo off
echo Stopping and removing existing containers and networks...
docker-compose down
REM If you also want to remove volumes (e.g., database data), use: docker-compose down --volumes

echo Rebuilding Docker images without cache...
docker-compose build --no-cache

echo Starting services in detached mode...
docker-compose up -d

echo Docker rebuild process completed.
