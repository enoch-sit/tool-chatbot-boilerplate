# Enhanced Migration Guide for Production

The enhanced migration script now includes interactive guidance to help you configure MongoDB connection details based on your Docker setup.

## Quick Start

### Option 1: Analyze Your Setup First (Recommended)
```bash
# Make scripts executable
chmod +x analyze_docker_setup.sh migrate_production.sh

# Analyze your Docker setup to understand MongoDB configuration
./analyze_docker_setup.sh

# Run the interactive migration script
./migrate_production.sh
```

### Option 2: Run Migration Directly (If you know your config)
```bash
# Set environment variables manually
export MONGODB_URL="mongodb://admin:password@localhost:27020/flowise_proxy_test?authSource=admin"
export MONGODB_DATABASE_NAME="flowise_proxy_test"

# Run migration
./migrate_production.sh
```

## What the Enhanced Script Does

### 1. **Docker Container Analysis**
- Shows all running Docker containers
- Identifies MongoDB containers automatically
- Displays port mappings and connection details

### 2. **Interactive Configuration**
- Prompts for MongoDB connection details
- Suggests connection strings based on detected containers
- Provides defaults for common setups

### 3. **Environment File Detection**
- Checks for `.env`, `.env.test`, `.env.prod` files
- Shows existing MongoDB configuration
- Guides you to find connection details

### 4. **Docker Compose Analysis**
- Analyzes `docker-compose.yml` files
- Shows MongoDB service configuration
- Helps identify correct connection parameters

### 5. **Enhanced Error Handling**
- Provides troubleshooting tips
- Suggests next steps on failure
- Comprehensive logging

## Common Docker Setups

### Test Environment (Your Current Setup)
```bash
# Based on your docker-compose.linux.yml
Container: mongodb-test
Port: 27020:27017
Connection: mongodb://admin:password@localhost:27020/flowise_proxy_test?authSource=admin
```

### Production Environment
```bash
# Typical production setup
Container: mongodb-prod
Port: 27017:27017
Connection: mongodb://admin:password@localhost:27017/flowise_proxy?authSource=admin
```

## Script Features

### Interactive Prompts
The script will ask you for:
- MongoDB host (localhost or container name)
- Port (27017 for direct, 27020 for Docker mapping)
- Database name (flowise_proxy_test or flowise_proxy)
- Authentication details (username/password)

### Automatic Detection
- Scans running Docker containers
- Identifies MongoDB containers
- Suggests appropriate connection strings

### Verification Steps
- Tests MongoDB connection before migration
- Verifies migration success
- Provides detailed status reports

## Usage Examples

### For Your Current Setup (aai02 server)
```bash
# Run the analysis script first
./analyze_docker_setup.sh

# Output will show:
# Container: mongodb-test
# Port: 27020:27017
# Suggested connection: mongodb://admin:password@localhost:27020/flowise_proxy_test?authSource=admin

# Then run migration
./migrate_production.sh
# Follow prompts or use suggested values
```

### Troubleshooting
If migration fails, the script provides:
- Connection troubleshooting tips
- Docker container diagnostic commands
- Log file locations
- Next steps guidance

## Safety Features
- ✅ Idempotent (safe to run multiple times)
- ✅ Non-destructive (only adds optional fields)
- ✅ Comprehensive logging
- ✅ Backup creation (if mongodump available)
- ✅ Verification steps
- ✅ User confirmation before proceeding

## Files Created
- `analyze_docker_setup.sh` - Docker setup analysis tool
- `migrate_production.sh` - Enhanced interactive migration script
- `logs/migration_TIMESTAMP.log` - Detailed migration log
- `backups/backup_TIMESTAMP/` - Database backup (if created)

Try running `./analyze_docker_setup.sh` first to understand your setup, then `./migrate_production.sh` for the migration!
