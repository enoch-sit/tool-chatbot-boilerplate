#!/bin/bash

# Production Migration Script for Flowise Proxy Service
# This script safely runs database migrations in production

set -e  # Exit on any error

echo "=========================================="
echo "🚀 Production Migration Script"
echo "=========================================="

# Configuration
BACKUP_DIR="backups"
LOG_DIR="logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MIGRATION_LOG="${LOG_DIR}/migration_${TIMESTAMP}.log"
BACKUP_NAME="${BACKUP_DIR}/backup_${TIMESTAMP}"

# Create directories if they don't exist
mkdir -p "$BACKUP_DIR" "$LOG_DIR"

# Function to display Docker containers and help user identify MongoDB
show_docker_containers() {
    echo ""
    echo "📋 Current Docker containers:"
    echo "----------------------------------------"
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}"
    echo ""
}

# Function to detect MongoDB containers automatically
detect_mongodb_containers() {
    echo "🔍 Scanning for MongoDB containers..."
    
    # Look for containers with mongo in the image name
    MONGO_CONTAINERS=$(docker ps --format "{{.Names}}\t{{.Image}}\t{{.Ports}}" | grep -i mongo || true)
    
    if [ -n "$MONGO_CONTAINERS" ]; then
        echo "Found MongoDB containers:"
        echo "$MONGO_CONTAINERS" | while IFS=$'\t' read -r name image ports; do
            echo "  📦 Container: $name"
            echo "     Image: $image"
            echo "     Ports: $ports"
            echo ""
        done
    else
        echo "❌ No MongoDB containers found"
    fi
}

# Function to get MongoDB connection details interactively
get_mongodb_config() {
    echo "🔧 MongoDB Configuration Setup"
    echo "================================"
    
    # Show current Docker setup
    show_docker_containers
    detect_mongodb_containers
    
    echo "📝 I need to configure MongoDB connection details."
    echo ""
    
    # Check if environment variables are already set
    if [ -n "$MONGODB_URL" ]; then
        echo "✅ MONGODB_URL already set: $MONGODB_URL"
        read -p "Do you want to use this existing value? (y/n): " use_existing
        if [[ $use_existing =~ ^[Yy]$ ]]; then
            return 0
        fi
    fi
    
    echo "🔍 Common MongoDB configurations based on your setup:"
    echo ""
    echo "For Docker Compose setups:"
    echo "  • Container name: mongodb-test"
    echo "  • Port mapping: 27020:27017 (host:container)"
    echo "  • Default credentials: admin/password"
    echo ""
    echo "For local MongoDB:"
    echo "  • Host: localhost"
    echo "  • Port: 27017"
    echo "  • No authentication needed"
    echo ""
    
    # Suggest connection strings based on detected containers
    if docker ps --format "{{.Names}}" | grep -q "mongodb-test"; then
        echo "💡 Detected 'mongodb-test' container. Suggested connection:"
        echo "   mongodb://admin:password@localhost:27020/flowise_proxy_test?authSource=admin"
        echo ""
    fi
    
    # Interactive input
    echo "Please provide MongoDB connection details:"
    echo ""
    
    # Host input
    read -p "📍 MongoDB Host (localhost for Docker port mapping, container name for internal): " MONGO_HOST
    MONGO_HOST=${MONGO_HOST:-localhost}
    
    # Port input
    read -p "🔌 MongoDB Port (27017 for direct, 27020 for Docker): " MONGO_PORT
    MONGO_PORT=${MONGO_PORT:-27017}
    
    # Database name input
    read -p "🗄️  Database Name (flowise_proxy_test for test, flowise_proxy for prod): " MONGO_DB
    MONGO_DB=${MONGO_DB:-flowise_proxy_test}
    
    # Authentication
    read -p "🔐 Does MongoDB require authentication? (y/n): " needs_auth
    
    if [[ $needs_auth =~ ^[Yy]$ ]]; then
        read -p "👤 Username (default: admin): " MONGO_USER
        MONGO_USER=${MONGO_USER:-admin}
        
        read -s -p "🔑 Password (default: password): " MONGO_PASS
        echo ""
        MONGO_PASS=${MONGO_PASS:-password}
        
        read -p "🏛️  Auth Source (default: admin): " MONGO_AUTH_SOURCE
        MONGO_AUTH_SOURCE=${MONGO_AUTH_SOURCE:-admin}
        
        MONGODB_URL="mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=${MONGO_AUTH_SOURCE}"
    else
        MONGODB_URL="mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}"
    fi
    
    # Set environment variables
    export MONGODB_URL
    export MONGODB_DATABASE_NAME="$MONGO_DB"
    
    echo ""
    echo "✅ MongoDB configuration set:"
    echo "   URL: $MONGODB_URL"
    echo "   Database: $MONGO_DB"
    echo ""
}

# Function to check environment files
check_env_files() {
    echo "🔍 Checking for environment files..."
    
    if [ -f ".env" ]; then
        echo "📄 Found .env file"
        echo "   You can check MongoDB settings with: cat .env | grep MONGODB"
    fi
    
    if [ -f ".env.test" ]; then
        echo "📄 Found .env.test file"
        echo "   You can check test MongoDB settings with: cat .env.test | grep MONGODB"
    fi
    
    if [ -f "docker-compose.yml" ]; then
        echo "📄 Found docker-compose.yml"
        echo "   You can check MongoDB config with: grep -A 10 -B 5 mongodb docker-compose.yml"
    fi
    
    if [ -f "docker-compose.linux.yml" ]; then
        echo "📄 Found docker-compose.linux.yml"
        echo "   You can check MongoDB config with: grep -A 10 -B 5 mongodb docker-compose.linux.yml"
    fi
    
    echo ""
}

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$MIGRATION_LOG"
}

# Function to check if MongoDB is accessible
check_mongodb() {
    log "🔍 Checking MongoDB connection..."
    
    # Try to connect to MongoDB
    if python -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import sys

async def test_connection():
    try:
        client = AsyncIOMotorClient(os.getenv('MONGODB_URL'))
        await client.admin.command('ping')
        client.close()
        print('MongoDB connection successful')
        return True
    except Exception as e:
        print(f'MongoDB connection failed: {e}')
        return False

result = asyncio.run(test_connection())
sys.exit(0 if result else 1)
" 2>&1 | tee -a "$MIGRATION_LOG"; then
        log "✅ MongoDB connection successful"
        return 0
    else
        log "❌ MongoDB connection failed"
        return 1
    fi
}

# Function to backup database
backup_database() {
    log "💾 Creating database backup..."
    
    # Check if mongodump is available
    if command -v mongodump >/dev/null 2>&1; then
        if mongodump --uri="$MONGODB_URL" --out="$BACKUP_NAME" 2>&1 | tee -a "$MIGRATION_LOG"; then
            log "✅ Database backup created: $BACKUP_NAME"
        else
            log "⚠️  Database backup failed, but continuing with migration"
        fi
    else
        log "⚠️  mongodump not available, skipping backup"
    fi
}

# Function to check migration status
check_migration_status() {
    log "📊 Checking current migration status..."
    
    python -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check_status():
    client = AsyncIOMotorClient(os.getenv('MONGODB_URL'))
    db = client[os.getenv('MONGODB_DATABASE_NAME')]
    collection = db.get_collection('chat_messages')
    
    total = await collection.count_documents({})
    with_metadata = await collection.count_documents({'metadata': {'$exists': True}})
    
    print(f'Total documents: {total}')
    print(f'Documents with metadata: {with_metadata}')
    print(f'Documents needing migration: {total - with_metadata}')
    
    client.close()
    
    return total > with_metadata

needs_migration = asyncio.run(check_status())
exit(0 if needs_migration else 1)
" 2>&1 | tee -a "$MIGRATION_LOG"
    
    return $?
}

# Function to run migration
run_migration() {
    log "🔄 Running database migration..."
    
    if python migrations/run_migrations.py --all 2>&1 | tee -a "$MIGRATION_LOG"; then
        log "✅ Migration completed successfully"
        return 0
    else
        log "❌ Migration failed"
        return 1
    fi
}

# Function to verify migration
verify_migration() {
    log "🔍 Verifying migration results..."
    
    python -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def verify():
    client = AsyncIOMotorClient(os.getenv('MONGODB_URL'))
    db = client[os.getenv('MONGODB_DATABASE_NAME')]
    collection = db.get_collection('chat_messages')
    
    total = await collection.count_documents({})
    with_metadata = await collection.count_documents({'metadata': {'$exists': True}})
    
    print(f'Total documents: {total}')
    print(f'Documents with metadata: {with_metadata}')
    
    success = total == with_metadata
    print(f'Migration verification: {'SUCCESS' if success else 'FAILED'}')
    
    client.close()
    return success

result = asyncio.run(verify())
exit(0 if result else 1)
" 2>&1 | tee -a "$MIGRATION_LOG"
    
    return $?
}

# Main execution
main() {
    log "🚀 Starting production migration process..."
    
    # Check environment files
    check_env_files
    
    # Get MongoDB configuration interactively if not set
    if [ -z "$MONGODB_URL" ]; then
        echo ""
        echo "⚠️  MONGODB_URL environment variable not set"
        echo "Let me help you configure it..."
        echo ""
        get_mongodb_config
    else
        log "✅ MONGODB_URL already configured: $MONGODB_URL"
    fi
    
    # Double-check required variables
    if [ -z "$MONGODB_URL" ]; then
        log "❌ MONGODB_URL is still not set after configuration"
        exit 1
    fi
    
    if [ -z "$MONGODB_DATABASE_NAME" ]; then
        log "❌ MONGODB_DATABASE_NAME is not set"
        exit 1
    fi
    
    log "📋 Using configuration:"
    log "   MongoDB URL: $MONGODB_URL"
    log "   Database: $MONGODB_DATABASE_NAME"
    log "   Log file: $MIGRATION_LOG"
    
    # Ask user confirmation
    echo ""
    read -p "🚀 Ready to proceed with migration? (y/n): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        log "❌ Migration cancelled by user"
        exit 0
    fi
    
    # Check MongoDB connection
    if ! check_mongodb; then
        log "❌ Cannot connect to MongoDB, aborting migration"
        echo ""
        echo "💡 Troubleshooting tips:"
        echo "  1. Check if MongoDB container is running: docker ps | grep mongo"
        echo "  2. Verify port mapping in docker-compose.yml"
        echo "  3. Test connection: docker exec mongodb-test mongosh --eval 'db.runCommand(\"ping\")'"
        echo "  4. Check MongoDB logs: docker logs mongodb-test"
        exit 1
    fi
    
    # Check if migration is needed
    if check_migration_status; then
        log "📋 Migration needed, proceeding..."
        
        # Create backup
        backup_database
        
        # Run migration
        if run_migration; then
            # Verify migration
            if verify_migration; then
                log "🎉 Migration completed successfully!"
                log "📄 Migration log saved to: $MIGRATION_LOG"
                echo ""
                echo "✅ Next steps:"
                echo "  1. Check the migration log for details: cat $MIGRATION_LOG"
                echo "  2. Test your application to ensure everything works"
                echo "  3. Monitor application logs for any issues"
                exit 0
            else
                log "❌ Migration verification failed"
                echo ""
                echo "🔧 What to do next:"
                echo "  1. Check the migration log: cat $MIGRATION_LOG"
                echo "  2. Verify MongoDB connection manually"
                echo "  3. Contact support if issues persist"
                exit 1
            fi
        else
            log "❌ Migration failed"
            echo ""
            echo "🔧 What to do next:"
            echo "  1. Check the migration log: cat $MIGRATION_LOG"
            echo "  2. Verify all migration files are present"
            echo "  3. Ensure Python dependencies are installed"
            exit 1
        fi
    else
        log "✅ No migration needed - all documents already have metadata field"
        echo ""
        echo "🎉 Your database is already up to date!"
        exit 0
    fi
}

# Run main function
main "$@"
