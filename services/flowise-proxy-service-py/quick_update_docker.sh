#!/bin/bash

# Quick Docker Update Script for Linux Deployment
# Simple script to update code in Docker containers

set -e

echo "=========================================="
echo "🚀 Quick Docker Code Update"
echo "=========================================="

# Default configuration
COMPOSE_FILE="${1:-docker-compose.yml}"
SKIP_MIGRATIONS="${2:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color="$1"
    local message="$2"
    echo -e "${color}${message}${NC}"
}

# Check if compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    print_status "$RED" "❌ Compose file not found: $COMPOSE_FILE"
    echo "Available compose files:"
    ls -la docker-compose*.yml 2>/dev/null || echo "No compose files found"
    exit 1
fi

print_status "$YELLOW" "📋 Using compose file: $COMPOSE_FILE"

# Show current containers
print_status "$YELLOW" "📋 Current containers:"
docker compose -f "$COMPOSE_FILE" ps || true

echo
read -p "Continue with update? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_status "$YELLOW" "Update cancelled."
    exit 0
fi

# Step 1: Stop containers
print_status "$YELLOW" "🛑 Stopping containers..."
docker compose -f "$COMPOSE_FILE" down --remove-orphans

# Step 2: Rebuild images
print_status "$YELLOW" "🔨 Rebuilding images..."
docker compose -f "$COMPOSE_FILE" build --no-cache

# Step 3: Start containers
print_status "$YELLOW" "🚀 Starting updated containers..."
docker compose -f "$COMPOSE_FILE" up -d

# Step 4: Wait for containers to be ready
print_status "$YELLOW" "⏳ Waiting for containers to be ready..."
sleep 10

# Step 5: Run migrations (if not skipped)
if [ "$SKIP_MIGRATIONS" != "true" ]; then
    print_status "$YELLOW" "🔄 Running database migrations..."
    
    # Determine main service name
    MAIN_SERVICE="flowise-proxy"
    if docker compose -f "$COMPOSE_FILE" ps --services | grep -q "flowise-proxy-test"; then
        MAIN_SERVICE="flowise-proxy-test"
    fi
    
    # Run migrations
    docker compose -f "$COMPOSE_FILE" exec "$MAIN_SERVICE" python migrations/run_migrations.py --all || {
        print_status "$RED" "❌ Migration failed!"
        exit 1
    }
    
    print_status "$GREEN" "✅ Migrations completed"
fi

# Step 6: Verify deployment
print_status "$YELLOW" "🔍 Verifying deployment..."
sleep 5

# Check container status
if docker compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
    print_status "$GREEN" "✅ Containers are running"
    
    # Test API endpoint
    if curl -f "http://localhost:8000/health" >/dev/null 2>&1; then
        print_status "$GREEN" "✅ API health check passed"
    else
        print_status "$YELLOW" "⚠️  API health check failed (containers may still be starting)"
    fi
else
    print_status "$RED" "❌ Containers are not running properly"
    exit 1
fi

# Show final status
print_status "$YELLOW" "📋 Final container status:"
docker compose -f "$COMPOSE_FILE" ps

print_status "$GREEN" "🎉 Docker code update completed successfully!"

echo
echo "Usage examples:"
echo "  $0                                    # Use default docker-compose.yml"
echo "  $0 docker-compose.linux.yml         # Use Linux test config"
echo "  $0 docker-compose.yml true          # Skip migrations"
