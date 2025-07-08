#!/bin/bash
# Usage:
#   ./rebuild-docker-rebuild-volume.sh
# Stops, rebuilds, and resets the accounting service database for Ubuntu/Linux.
# WARNING: This will DELETE the accounting service database!
# To use: chmod +x ./rebuild-docker-rebuild-volume.sh && ./rebuild-docker-rebuild-volume.sh

echo "======================================================"
echo "WARNING: This will DELETE the accounting service database!"
echo "This action cannot be undone."
echo "======================================================"
read -p "Are you sure you want to continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Operation cancelled."
    exit 0
fi

echo
echo "Stopping containers and removing the postgres-data volume..."
docker compose -f docker-compose.linux.yml down --volumes

echo
echo "Rebuilding Docker images without cache..."
docker compose -f docker-compose.linux.yml build --no-cache

echo
echo "Starting services in detached mode..."
docker compose -f docker-compose.linux.yml up -d

echo
echo "======================================================"
echo "Docker rebuild with volume reset completed."
echo "The accounting service database has been cleared."
echo "======================================================"
