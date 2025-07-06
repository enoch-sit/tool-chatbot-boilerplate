@echo off

REM Stop and remove the old container if it exists
for /f "tokens=*" %%i in ('docker ps -q -f name=interact-bridge-ui') do (
    docker stop %%i
    docker rm %%i
)

REM Rebuild the Docker image
docker build -t interact-bridge-ui .

REM Run the new container
docker run -d -p 5000:5000 --name interact-bridge-ui interact-bridge-ui

echo Docker container 'interact-bridge-ui' is running on http://localhost:5000
