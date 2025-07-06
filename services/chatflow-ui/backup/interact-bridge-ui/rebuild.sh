#!/bin/bash

# Stop and remove the old container if it exists
if [ "$(docker ps -q -f name=interact-bridge-ui)" ]; then
    docker stop interact-bridge-ui
    docker rm interact-bridge-ui
fi

# Rebuild the Docker image
docker build -t interact-bridge-ui .

# Run the new container
docker run -d -p 5000:5000 --name interact-bridge-ui interact-bridge-ui

echo "Docker container 'interact-bridge-ui' is running on http://localhost:5000"
