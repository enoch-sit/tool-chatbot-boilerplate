@echo off
echo Building and starting Bridge UI Docker container...
echo.

REM Build and start the container
docker-compose up --build -d

echo.
echo Bridge UI is now running on http://localhost:3082
echo.
echo To stop the container, run: docker-compose down
echo To view logs, run: docker-compose logs -f bridge-ui
echo.
