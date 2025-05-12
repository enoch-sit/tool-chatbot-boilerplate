@echo off
echo Stopping and removing existing containers, networks, and volumes...
docker-compose down

echo Rebuilding Docker images without cache...
docker-compose build --no-cache

echo Starting services in detached mode...
docker-compose up -d

echo Docker rebuild process completed.
