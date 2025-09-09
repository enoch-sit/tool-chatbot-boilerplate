#!/bin/bash

echo "======================================================"
echo "Running Database Migrations in Docker Container"
echo "======================================================"

# Check if the container is running
if ! sudo docker ps | grep -q "flowise-proxy-test"; then
    echo "❌ flowise-proxy-test container is not running"
    echo "Please run ./rebuild-docker-test.sh first"
    exit 1
fi

# Check if MongoDB is ready
echo "Checking MongoDB connectivity..."
if ! sudo docker exec mongodb-test mongosh --eval "db.runCommand('ping')" --quiet; then
    echo "❌ MongoDB is not ready"
    exit 1
fi

echo "✅ MongoDB is ready"

# Run migrations
echo
echo "Running database migrations..."
sudo docker exec flowise-proxy-test python migrations/run_migrations.py --all

if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully"
else
    echo "❌ Migration failed"
    exit 1
fi

echo
echo "======================================================"
echo "Migration complete. You can now test the application."
echo "======================================================"
