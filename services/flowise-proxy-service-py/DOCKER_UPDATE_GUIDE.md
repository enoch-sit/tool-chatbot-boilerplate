# Docker Code Update Guide for Linux Deployment

This guide explains how to update your Flowise Proxy Service code in Docker containers on Linux.

## 📋 Overview

The project has multiple Docker configurations:
- `docker-compose.yml` - Production deployment
- `docker-compose.linux.yml` - Linux test environment
- `docker-compose.test.yml` - Test environment
- `docker-compose.dbonly.yml` - Database only

## 🚀 Quick Update Methods

### Method 1: Using the Quick Update Script

```bash
# Make script executable
chmod +x quick_update_docker.sh

# Update production (default)
./quick_update_docker.sh

# Update test environment
./quick_update_docker.sh docker-compose.linux.yml

# Update without running migrations
./quick_update_docker.sh docker-compose.yml true
```

### Method 2: Using the Comprehensive Update Script

```bash
# Make script executable
chmod +x update_docker_code.sh

# Full update with backup and verification
./update_docker_code.sh docker-compose.yml

# Update test environment
./update_docker_code.sh docker-compose.linux.yml

# Update without migrations
./update_docker_code.sh docker-compose.yml true
```

### Method 3: Manual Update Process

```bash
# 1. Stop containers
docker compose -f docker-compose.yml down --remove-orphans

# 2. Rebuild images (no cache for fresh build)
docker compose -f docker-compose.yml build --no-cache

# 3. Start containers
docker compose -f docker-compose.yml up -d

# 4. Wait for containers to be ready
sleep 10

# 5. Run migrations (if needed)
docker compose -f docker-compose.yml exec flowise-proxy python migrations/run_migrations.py --all

# 6. Verify deployment
docker compose -f docker-compose.yml ps
curl -f http://localhost:8000/health
```

## 🔧 Configuration-Specific Commands

### Production Environment (`docker-compose.yml`)

```bash
# Stop services
docker compose down --remove-orphans

# Rebuild and start
docker compose build --no-cache
docker compose up -d

# Run migrations
docker compose exec flowise-proxy python migrations/run_migrations.py --all

# Check status
docker compose ps
```

### Linux Test Environment (`docker-compose.linux.yml`)

```bash
# Stop services
docker compose -f docker-compose.linux.yml down --remove-orphans

# Rebuild and start
docker compose -f docker-compose.linux.yml build --no-cache
docker compose -f docker-compose.linux.yml up -d

# Run migrations
docker compose -f docker-compose.linux.yml exec flowise-proxy-test python migrations/run_migrations.py --all

# Check status
docker compose -f docker-compose.linux.yml ps
```

## 🗄️ Database Migration Management

### Run All Migrations

```bash
# Production
docker compose exec flowise-proxy python migrations/run_migrations.py --all

# Test environment
docker compose -f docker-compose.linux.yml exec flowise-proxy-test python migrations/run_migrations.py --all
```

### Run Specific Migration

```bash
# Production
docker compose exec flowise-proxy python migrations/run_migrations.py --migration add_metadata_to_chat_messages

# Test environment
docker compose -f docker-compose.linux.yml exec flowise-proxy-test python migrations/run_migrations.py --migration add_metadata_to_chat_messages
```

## 🔍 Verification Steps

### 1. Check Container Status
```bash
docker compose ps
```

### 2. Check Application Health
```bash
curl -f http://localhost:8000/health
```

### 3. Check Logs
```bash
# View recent logs
docker compose logs --tail=50 flowise-proxy

# Follow logs in real-time
docker compose logs -f flowise-proxy
```

### 4. Test API Endpoints
```bash
# Test authentication endpoint
curl -X POST http://localhost:8000/api/v1/chat/authenticate \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "test"}'
```

## 🛠️ Troubleshooting

### If Update Fails

1. **Check container logs:**
   ```bash
   docker compose logs flowise-proxy
   ```

2. **Rollback to previous version:**
   ```bash
   # Stop current containers
   docker compose down --remove-orphans
   
   # If you have image backups
   docker load < backups/pre_update_backup_*/flowise-proxy_image.tar.gz
   
   # Start previous version
   docker compose up -d
   ```

3. **Force rebuild:**
   ```bash
   docker compose down --remove-orphans --volumes
   docker compose build --no-cache --pull
   docker compose up -d
   ```

### Common Issues

#### Migration Fails
```bash
# Check migration logs
docker compose logs flowise-proxy | grep -i migration

# Reset and retry
docker compose exec flowise-proxy python migrations/run_migrations.py --migration add_metadata_to_chat_messages
```

#### Container Won't Start
```bash
# Check for port conflicts
netstat -tlnp | grep :8000

# Check Docker resources
docker system df
docker system prune -f
```

#### Database Connection Issues
```bash
# Check MongoDB container
docker compose ps mongodb

# Test MongoDB connection
docker compose exec mongodb mongosh --eval "db.runCommand('ping')"
```

## 📁 File Structure for Updates

When updating code, these files are key:

```
├── app/
│   ├── api/
│   │   └── chat.py          # Main chat endpoints (including file upload support)
│   ├── models/
│   ├── services/
│   └── main.py
├── migrations/
│   └── run_migrations.py    # Migration runner
├── docker-compose.yml       # Production config
├── docker-compose.linux.yml # Linux test config
├── Dockerfile               # Image definition
├── requirements.txt         # Python dependencies
├── update_docker_code.sh    # Comprehensive update script
└── quick_update_docker.sh   # Quick update script
```

## 🔄 Best Practices

1. **Always backup before updates:**
   ```bash
   # Create backup of current state
   docker compose down
   docker save $(docker compose images -q) | gzip > backup_$(date +%Y%m%d_%H%M%S).tar.gz
   ```

2. **Test in development first:**
   ```bash
   # Test with Linux config first
   ./quick_update_docker.sh docker-compose.linux.yml
   ```

3. **Monitor during updates:**
   ```bash
   # Keep logs open during update
   docker compose logs -f flowise-proxy &
   ./quick_update_docker.sh
   ```

4. **Verify after updates:**
   ```bash
   # Check all endpoints still work
   curl -f http://localhost:8000/health
   curl -f http://localhost:8000/api/v1/chat/authenticate
   ```

## 🎯 Production Deployment Checklist

- [ ] Stop containers gracefully
- [ ] Create backup of current state
- [ ] Rebuild images with no cache
- [ ] Start containers
- [ ] Wait for containers to be ready
- [ ] Run database migrations
- [ ] Verify API endpoints
- [ ] Check application logs
- [ ] Test critical functionality
- [ ] Monitor for errors

## 📞 Support

If you encounter issues:
1. Check the logs: `docker compose logs flowise-proxy`
2. Verify container status: `docker compose ps`
3. Test API health: `curl -f http://localhost:8000/health`
4. Check migration status in the logs
5. Rollback if necessary using backup images
