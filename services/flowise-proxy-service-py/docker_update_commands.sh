#!/bin/bash
# Docker Update Commands - Quick Reference

echo "=================================================="
echo "🚀 Docker Update Commands - Quick Reference"
echo "=================================================="

cat << 'EOF'

# ==========================================
# PRODUCTION UPDATE (docker-compose.yml)
# ==========================================

# Quick update with script
./quick_update_docker.sh

# Manual update
docker compose down --remove-orphans
docker compose build --no-cache
docker compose up -d
docker compose exec flowise-proxy python migrations/run_migrations.py --all

# ==========================================
# TEST ENVIRONMENT (docker-compose.linux.yml)
# ==========================================

# Quick update with script
./quick_update_docker.sh docker-compose.linux.yml

# Manual update
docker compose -f docker-compose.linux.yml down --remove-orphans
docker compose -f docker-compose.linux.yml build --no-cache
docker compose -f docker-compose.linux.yml up -d
docker compose -f docker-compose.linux.yml exec flowise-proxy-test python migrations/run_migrations.py --all

# ==========================================
# VERIFICATION COMMANDS
# ==========================================

# Check container status
docker compose ps

# Check application health
curl -f http://localhost:8000/health

# View logs
docker compose logs --tail=50 flowise-proxy

# Follow logs
docker compose logs -f flowise-proxy

# ==========================================
# TROUBLESHOOTING
# ==========================================

# Force rebuild everything
docker compose down --remove-orphans --volumes
docker compose build --no-cache --pull
docker compose up -d

# Check migration status
docker compose exec flowise-proxy python migrations/run_migrations.py --all

# Reset and clean Docker
docker system prune -f
docker volume prune -f

# ==========================================
# BACKUP COMMANDS
# ==========================================

# Create backup before update
docker compose down
docker save $(docker compose images -q) | gzip > backup_$(date +%Y%m%d_%H%M%S).tar.gz

# Restore backup
docker load < backup_file.tar.gz
docker compose up -d

EOF

echo "=================================================="
echo "Use these commands to update your Docker deployment"
echo "=================================================="
