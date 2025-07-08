#!/bin/bash
# Usage:
#   ./start-docker.sh
# Starts Docker Compose services in detached mode for Ubuntu/Linux.
echo "Starting Docker services in detached mode..."
docker compose -f docker-compose.linux.yml up -d
echo "Docker services started."
