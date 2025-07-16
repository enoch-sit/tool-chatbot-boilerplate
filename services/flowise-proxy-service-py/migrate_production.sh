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
    
    # Check if required environment variables are set
    if [ -z "$MONGODB_URL" ]; then
        log "❌ MONGODB_URL environment variable not set"
        exit 1
    fi
    
    # Check MongoDB connection
    if ! check_mongodb; then
        log "❌ Cannot connect to MongoDB, aborting migration"
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
                exit 0
            else
                log "❌ Migration verification failed"
                exit 1
            fi
        else
            log "❌ Migration failed"
            exit 1
        fi
    else
        log "✅ No migration needed - all documents already have metadata field"
        exit 0
    fi
}

# Run main function
main "$@"
