#!/bin/bash

echo "======================================================"
echo "WARNING: This will DELETE ALL TEST VOLUME DATA including test databases!"
echo "This action cannot be undone."
echo "======================================================"
read -p "Are you sure you want to continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Operation cancelled."
    exit 0
fi

echo
echo "Stopping and removing existing test containers, networks, and volumes..."
sudo docker compose -f docker-compose.linux.yml down --volumes --remove-orphans

echo
echo "Removing test Docker volume..."
sudo docker volume rm flowise-proxy-service-py_mongodb_test_data 2>/dev/null

echo
echo "Skipping network prune to preserve auth and accounting networks..."
# sudo docker network prune -f

echo
echo "Rebuilding test Docker images without cache..."
sudo docker compose -f docker-compose.linux.yml build --no-cache || { echo "Build failed"; exit 1; }

echo
echo "Starting test services in detached mode..."
sudo docker compose -f docker-compose.linux.yml up -d || { echo "Startup failed"; exit 1; }

echo
echo "Waiting for MongoDB test container to be ready..."
for i in {1..30}; do
    if sudo docker exec mongodb-test mongosh --eval "db.runCommand('ping')" --quiet; then
        echo "MongoDB is ready!"
        break
    fi
    echo "Waiting for MongoDB ($i/30)..."
    sleep 2
done

echo
echo "Running database migrations..."
sudo docker exec flowise-proxy-test python migrations/run_migrations.py --all || { echo "Migration failed"; exit 1; }

echo
echo "Checking test container status..."
sudo docker compose -f docker-compose.linux.yml ps

echo
echo "Displaying recent logs for the test server..."
sudo docker compose -f docker-compose.linux.yml logs --tail=20 flowise-proxy-test

echo
echo "======================================================"
echo "Test environment rebuilt. Check logs for any errors."
echo "======================================================"
read -p "Press Enter to continue..."