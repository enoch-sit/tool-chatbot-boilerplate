@echo off
echo ======================================================
echo WARNING: This will DELETE ALL VOLUME DATA including databases!
echo This action cannot be undone.
echo ======================================================
set /p confirm="Are you sure you want to continue? (yes/no): "
if not "%confirm%"=="yes" (
    echo Operation cancelled.
    exit /b 0
)

echo.
echo Stopping and removing existing containers, networks, and volumes...
docker-compose down --volumes --remove-orphans

echo.
echo Removing all Docker volumes (this will delete all persistent data)...
docker volume prune -f

echo.
echo Removing all unused Docker networks...
docker network prune -f

echo.
echo Removing all unused Docker images...
docker image prune -af

echo.
echo Pruning Docker system to remove unused data, including build cache...
docker system prune -af --volumes

echo.
echo Rebuilding Docker images without cache...
docker-compose build --no-cache

echo.
echo Starting services in detached mode...
docker-compose up -d

echo.
echo ======================================================
echo Docker rebuild with volume reset completed.
echo All previous data has been cleared.
echo Services are starting up - please wait for initialization.
echo ======================================================
