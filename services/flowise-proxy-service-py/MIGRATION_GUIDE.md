# Database Migration Guide for Flowise Proxy Service

## Overview
This guide explains how to manage database migrations for the ChatMessage model, specifically adding the `metadata` field to store non-token events from Flowise streaming responses.

## File Structure and Purpose

```
migrations/
├── add_metadata_to_chat_messages.py    # Main migration script
├── run_migrations.py                   # Migration runner/orchestrator
└── reset_chat_messages_session_test.py # Test environment reset (existing)

scripts/
├── run-migrations.bat                  # Windows migration runner
├── run-migrations-docker.sh            # Linux Docker migration runner
├── rebuild-docker-dbonly.bat          # Windows DB-only Docker setup (modified)
└── rebuild-docker-test.sh             # Linux full Docker setup (modified)
```

## Migration Files Explained

### 1. `migrations/add_metadata_to_chat_messages.py`
- **Purpose**: Core migration script that adds the `metadata` field to existing ChatMessage documents
- **Features**:
  - Adds optional `metadata` field to documents that don't have it
  - Includes rollback functionality
  - Provides verification and progress reporting
  - Safe to run multiple times (idempotent)

### 2. `migrations/run_migrations.py`
- **Purpose**: Migration orchestrator that manages running multiple migrations
- **Features**:
  - Can run all migrations or specific ones
  - Provides consistent logging and error handling
  - Extensible for future migrations

### 3. `run-migrations.bat` (Windows)
- **Purpose**: Windows batch script to run migrations locally
- **Use Case**: When using `rebuild-docker-dbonly.bat` (local app + containerized DB)

### 4. `run-migrations-docker.sh` (Linux)
- **Purpose**: Linux script to run migrations inside Docker containers
- **Use Case**: When using `rebuild-docker-test.sh` (fully containerized)

## Usage Scenarios

### Scenario 1: Windows Development (DB-only Docker)
**When**: Using `rebuild-docker-dbonly.bat` - MongoDB in container, app runs locally in VS Code

**Setup**:
1. Run `rebuild-docker-dbonly.bat`
2. Choose "yes" when prompted to run migrations
   
**OR manually**:
1. Run `rebuild-docker-dbonly.bat`
2. Run `run-migrations.bat` separately

**Environment**: 
- MongoDB: `mongodb://admin:password@localhost:27020/flowise_proxy_test`
- App: Runs locally with VS Code debugger

---

### Scenario 2: Linux Development (Full Docker)
**When**: Using `rebuild-docker-test.sh` - Everything in containers

**Setup**:
1. Run `./rebuild-docker-test.sh` (migrations run automatically)

**OR manually**:
1. Run `./rebuild-docker-test.sh`
2. Run `./run-migrations-docker.sh` separately

**Environment**:
- MongoDB: Inside `mongodb-test` container
- App: Inside `flowise-proxy-test` container

---

### Scenario 3: Production Deployment
**When**: Deploying to production servers

**Setup**:
1. Backup production database
2. Run `python migrations/run_migrations.py --all`
3. Verify migration success

**Environment**:
- Uses production MongoDB connection
- Runs on production server

---

## Step-by-Step Usage Guide

### For Windows Development (Most Common)

1. **Start Database**:
   ```cmd
   rebuild-docker-dbonly.bat
   ```
   - Choose "yes" when asked about migrations

2. **If migrations need to be run later**:
   ```cmd
   run-migrations.bat
   ```

3. **Start your app** in VS Code with "Python Debugger: FastAPI (Test DB)"

### For Linux Development

1. **Start Everything**:
   ```bash
   ./rebuild-docker-test.sh
   ```
   - Migrations run automatically

2. **If migrations need to be run later**:
   ```bash
   ./run-migrations-docker.sh
   ```

### For Production

1. **Backup Database**:
   ```bash
   mongodump --uri="production_uri" --out="backup_$(date +%Y%m%d_%H%M%S)"
   ```

2. **Run Migrations**:
   ```bash
   python migrations/run_migrations.py --all
   ```

3. **Verify**:
   ```bash
   python migrations/add_metadata_to_chat_messages.py --verify
   ```

## Migration Commands Reference

### Run All Migrations
```bash
# Python direct
python migrations/run_migrations.py --all

# Windows batch
run-migrations.bat

# Linux Docker
./run-migrations-docker.sh
```

### Run Specific Migration
```bash
python migrations/run_migrations.py --migration add_metadata_to_chat_messages
```

### Rollback Migration (Use with caution!)
```bash
python migrations/add_metadata_to_chat_messages.py --rollback
```

## Environment Variables Required

Ensure these are set in your `.env.test` or `.env` file:

```env
MONGODB_URL=mongodb://admin:password@localhost:27020/flowise_proxy_test?authSource=admin
MONGODB_DATABASE_NAME=flowise_proxy_test
```

## Troubleshooting

### Common Issues:

1. **"MongoDB not ready"**:
   - Wait for MongoDB container to fully start
   - Check container status: `docker ps`

2. **"Migration failed"**:
   - Check MongoDB connection string
   - Verify environment variables
   - Check container logs: `docker logs mongodb-test`

3. **"Collection not found"**:
   - Normal for fresh databases
   - Collections are created automatically on first use

### Verification Commands:

```bash
# Check if migration was successful
python -c "
import asyncio
from app.models.chat_message import ChatMessage
from beanie import init_beanie
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
    print(f'Migration success: {total == with_metadata}')

asyncio.run(verify())
"
```

## Best Practices

1. **Always backup** production data before migrations
2. **Test migrations** in development environment first
3. **Run migrations** before starting the application
4. **Verify migration success** after running
5. **Keep migration scripts** in version control
6. **Document breaking changes** in migration comments

## Quick Reference

| Environment | Command | When to Use |
|-------------|---------|-------------|
| Windows Dev | `rebuild-docker-dbonly.bat` | Fresh start with migrations |
| Windows Dev | `run-migrations.bat` | Run migrations separately |
| Linux Dev | `./rebuild-docker-test.sh` | Fresh start (auto-migrates) |
| Linux Dev | `./run-migrations-docker.sh` | Run migrations separately |
| Production | `python migrations/run_migrations.py --all` | Production deployment |

## Migration Safety

- All migrations are **idempotent** (safe to run multiple times)
- The `metadata` field is **optional** (won't break existing code)
- **Rollback functionality** is available if needed
- **Verification steps** ensure migration success
