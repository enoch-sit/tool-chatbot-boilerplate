#!/bin/bash

# Docker Code Update Script for Linux Deployment
# This script updates the Flowise Proxy Service code in Docker containers

set -e  # Exit on any error

echo "=========================================="
echo "🚀 Docker Code Update Script - Linux Deployment"
echo "=========================================="

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_DIR="logs"
BACKUP_DIR="backups"
UPDATE_LOG="${LOG_DIR}/update_${TIMESTAMP}.log"
BACKUP_NAME="${BACKUP_DIR}/pre_update_backup_${TIMESTAMP}"

# Create directories if they don't exist
mkdir -p "$LOG_DIR" "$BACKUP_DIR"

# Function to log messages
log_message() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" | tee -a "$UPDATE_LOG"
}

# Function to show available Docker Compose files
show_compose_files() {
    echo ""
    echo "📋 Available Docker Compose configurations:"
    echo "----------------------------------------"
    ls -la docker-compose*.yml 2>/dev/null || echo "No docker-compose files found"
    echo ""
}

# Function to show current Docker containers
show_containers() {
    echo ""
    echo "📋 Current Docker containers:"
    echo "----------------------------------------"
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}"
    echo ""
}

# Function to check if containers are running
check_containers() {
    local compose_file="$1"
    log_message "Checking container status for $compose_file..."
    
    if docker compose -f "$compose_file" ps | grep -q "Up"; then
        log_message "✅ Containers are running"
        return 0
    else
        log_message "❌ Containers are not running"
        return 1
    fi
}

# Function to create backup of current state
create_backup() {
    local compose_file="$1"
    log_message "Creating backup of current state..."
    
    # Create backup directory for this update
    mkdir -p "$BACKUP_NAME"
    
    # Backup current source code
    log_message "Backing up source code..."
    tar -czf "${BACKUP_NAME}/source_code_backup.tar.gz" \
        --exclude='__pycache__' \
        --exclude='*.pyc' \
        --exclude='.git' \
        --exclude='logs' \
        --exclude='backups' \
        . || true
    
    # Backup container images
    log_message "Backing up Docker images..."
    docker compose -f "$compose_file" images --format "table {{.Service}}\t{{.Repository}}\t{{.Tag}}" > "${BACKUP_NAME}/images_list.txt"
    
    # Export current images
    local services=$(docker compose -f "$compose_file" config --services)
    for service in $services; do
        local image=$(docker compose -f "$compose_file" images -q "$service")
        if [ ! -z "$image" ]; then
            log_message "Exporting image for service: $service"
            docker save "$image" | gzip > "${BACKUP_NAME}/${service}_image.tar.gz" || true
        fi
    done
    
    log_message "✅ Backup completed: $BACKUP_NAME"
}

# Function to stop containers gracefully
stop_containers() {
    local compose_file="$1"
    log_message "Stopping containers gracefully..."
    
    # Give services time to finish current requests
    log_message "Waiting for current requests to finish..."
    sleep 5
    
    # Stop containers
    docker compose -f "$compose_file" down --remove-orphans || {
        log_message "❌ Failed to stop containers gracefully"
        return 1
    }
    
    log_message "✅ Containers stopped successfully"
}

# Function to update code (rebuild images)
update_code() {
    local compose_file="$1"
    log_message "Updating code by rebuilding Docker images..."
    
    # Build new images with no cache to ensure fresh build
    docker compose -f "$compose_file" build --no-cache || {
        log_message "❌ Failed to rebuild images"
        return 1
    }
    
    log_message "✅ Images rebuilt successfully"
}

# Function to start containers
start_containers() {
    local compose_file="$1"
    log_message "Starting updated containers..."
    
    # Start containers in detached mode
    docker compose -f "$compose_file" up -d || {
        log_message "❌ Failed to start containers"
        return 1
    }
    
    log_message "✅ Containers started successfully"
}

# Function to run database migrations
run_migrations() {
    local compose_file="$1"
    log_message "Running database migrations..."
    
    # Wait for containers to be ready
    log_message "Waiting for containers to be ready..."
    sleep 10
    
    # Determine the main service name
    local main_service="flowise-proxy"
    if docker compose -f "$compose_file" ps | grep -q "flowise-proxy-test"; then
        main_service="flowise-proxy-test"
    fi
    
    # Run migrations
    log_message "Running migrations in container: $main_service"
    docker compose -f "$compose_file" exec "$main_service" python migrations/run_migrations.py --all || {
        log_message "❌ Migration failed"
        return 1
    }
    
    log_message "✅ Migrations completed successfully"
}

# Function to verify deployment
verify_deployment() {
    local compose_file="$1"
    log_message "Verifying deployment..."
    
    # Check container health
    local main_service="flowise-proxy"
    if docker compose -f "$compose_file" ps | grep -q "flowise-proxy-test"; then
        main_service="flowise-proxy-test"
    fi
    
    # Wait for health check
    log_message "Waiting for health check..."
    sleep 15
    
    # Check if containers are healthy
    if docker compose -f "$compose_file" ps | grep -q "healthy\\|Up"; then
        log_message "✅ Containers are healthy"
        
        # Test API endpoint
        local port="8000"
        if curl -f "http://localhost:${port}/health" >/dev/null 2>&1; then
            log_message "✅ API health check passed"
        else
            log_message "⚠️  API health check failed, but containers are running"
        fi
        
        return 0
    else
        log_message "❌ Containers are not healthy"
        return 1
    fi
}

# Function to rollback on failure
rollback() {
    local compose_file="$1"
    log_message "🔄 Starting rollback process..."
    
    # Stop current containers
    docker compose -f "$compose_file" down --remove-orphans || true
    
    # Restore images from backup
    log_message "Restoring images from backup..."
    for image_file in "${BACKUP_NAME}"/*_image.tar.gz; do
        if [ -f "$image_file" ]; then
            log_message "Restoring image: $(basename "$image_file")"
            docker load < "$image_file" || true
        fi
    done
    
    # Start containers with old images
    docker compose -f "$compose_file" up -d || {
        log_message "❌ Rollback failed"
        return 1
    }
    
    log_message "✅ Rollback completed"
}

# Function to cleanup old backups
cleanup_old_backups() {
    log_message "Cleaning up old backups (keeping last 5)..."
    
    # Keep only the 5 most recent backups
    ls -t "${BACKUP_DIR}"/pre_update_backup_* 2>/dev/null | tail -n +6 | xargs -r rm -rf
    
    log_message "✅ Cleanup completed"
}

# Main deployment function
main() {
    local compose_file="${1:-docker-compose.yml}"
    local skip_migrations="${2:-false}"
    
    log_message "Starting code update process..."
    log_message "Using compose file: $compose_file"
    log_message "Skip migrations: $skip_migrations"
    
    # Validate compose file exists
    if [ ! -f "$compose_file" ]; then
        log_message "❌ Compose file not found: $compose_file"
        show_compose_files
        exit 1
    fi
    
    # Show current state
    show_containers
    
    # Check if containers are running
    if ! check_containers "$compose_file"; then
        log_message "⚠️  Containers are not running, starting fresh deployment..."
        docker compose -f "$compose_file" up -d --build
        
        if [ "$skip_migrations" != "true" ]; then
            run_migrations "$compose_file"
        fi
        
        verify_deployment "$compose_file"
        log_message "✅ Fresh deployment completed"
        return 0
    fi
    
    # Create backup
    create_backup "$compose_file"
    
    # Update process
    if stop_containers "$compose_file" && \
       update_code "$compose_file" && \
       start_containers "$compose_file"; then
        
        # Run migrations if not skipped
        if [ "$skip_migrations" != "true" ]; then
            if ! run_migrations "$compose_file"; then
                log_message "❌ Migration failed, initiating rollback..."
                rollback "$compose_file"
                exit 1
            fi
        fi
        
        # Verify deployment
        if verify_deployment "$compose_file"; then
            log_message "🎉 Code update completed successfully!"
            cleanup_old_backups
        else
            log_message "❌ Deployment verification failed, initiating rollback..."
            rollback "$compose_file"
            exit 1
        fi
    else
        log_message "❌ Update process failed, initiating rollback..."
        rollback "$compose_file"
        exit 1
    fi
}

# Script entry point
if [ "$#" -eq 0 ]; then
    echo "Usage: $0 [docker-compose-file] [skip-migrations]"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Use default docker-compose.yml"
    echo "  $0 docker-compose.yml               # Use production config"
    echo "  $0 docker-compose.linux.yml         # Use Linux test config"
    echo "  $0 docker-compose.yml true          # Skip migrations"
    echo ""
    echo "Available options:"
    show_compose_files
    exit 1
fi

# Run main function with arguments
main "$@"
