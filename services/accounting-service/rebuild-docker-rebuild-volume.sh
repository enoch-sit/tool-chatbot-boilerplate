#!/bin/bash
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
docker compose down --volumes

echo
echo "Rebuilding Docker images without cache..."
docker compose build --no-cache

echo
echo "Starting services in detached mode..."
docker compose up -d

echo
echo "======================================================"
echo "Docker rebuild with volume reset completed."
echo "The accounting service database has been cleared."
echo "======================================================"
