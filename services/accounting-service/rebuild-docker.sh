#!/bin/bash
# Usage:
#   ./rebuild-docker.sh
# Stops, rebuilds, and restarts Docker Compose services for Ubuntu/Linux.
# To use: chmod +x ./rebuild-docker.sh && ./rebuild-docker.sh

echo "Stopping and removing existing containers and networks..."
docker compose -f docker-compose.linux.yml down --volumes
# If you also want to remove volumes (e.g., database data), use: docker compose down --volumes

echo "Rebuilding Docker images without cache..."
docker compose -f docker-compose.linux.yml build --no-cache


echo "Starting services in detached mode..."
docker compose -f docker-compose.linux.yml up -d

echo "Docker rebuild process completed."
