@echo off
echo ======================================================
echo  Starting Test Environment with Docker Compose
echo ======================================================
echo.

echo Step 1: Building images and starting containers...
docker compose -f docker-compose.test.yml up -d --build

echo.
echo ======================================================
echo Services should be starting up in the background.
echo.
echo To check the status of the containers, run:
echo docker ps
echo.
echo To view the logs of the application, run:
echo docker compose -f docker-compose.test.yml logs -f flowise-proxy-test
echo ======================================================
echo.
pause
