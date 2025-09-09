#!/bin/bash

# Simple Production Migration Script for docker-compose.linux.yml
# Designed for your specific production environment

echo "=========================================="
echo "🚀 Production Migration (Linux Docker)"
echo "=========================================="

# Configuration
COMPOSE_FILE="docker-compose.linux.yml"
LOG_FILE="migration-$(date +%Y%m%d_%H%M%S).log"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

# Function to check if containers are running
check_containers() {
    log_info "Checking Docker containers..."
    
    # Check for flowise-proxy-test container
    if docker ps --format "{{.Names}}" | grep -q "flowise-proxy-test"; then
        FLOWISE_CONTAINER="flowise-proxy-test"
        log_success "Found Flowise container: $FLOWISE_CONTAINER"
    else
        log_warning "flowise-proxy-test container not running"
        FLOWISE_CONTAINER=""
    fi
    
    # Check for mongodb-test container
    if docker ps --format "{{.Names}}" | grep -q "mongodb-test"; then
        MONGODB_CONTAINER="mongodb-test"
        log_success "Found MongoDB container: $MONGODB_CONTAINER"
    else
        log_error "mongodb-test container not running"
        return 1
    fi
    
    # Display current containers
    log_info "Current running containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | tee -a "$LOG_FILE"
    
    return 0
}

# Function to ensure services are running
ensure_services_running() {
    log_info "Ensuring services are running..."
    
    # Start services if not running
    if ! docker ps --format "{{.Names}}" | grep -q "flowise-proxy-test\|mongodb-test"; then
        log_info "Starting services with docker-compose..."
        sudo docker-compose -f "$COMPOSE_FILE" up -d
        
        # Wait for services to be ready
        log_info "Waiting for services to be ready..."
        sleep 15
        
        # Check MongoDB readiness
        for i in {1..30}; do
            if sudo docker exec mongodb-test mongosh --eval "db.runCommand('ping')" --quiet; then
                log_success "MongoDB is ready!"
                break
            fi
            log_info "Waiting for MongoDB ($i/30)..."
            sleep 2
        done
    fi
}

# Function to test database connection
test_database() {
    log_info "Testing database connection..."
    
    if sudo docker exec mongodb-test mongosh --eval "
        use flowise_proxy_test;
        db.runCommand('ping');
        print('Database: ' + db.getName());
        print('Collections: ' + db.getCollectionNames().length);
    " --quiet; then
        log_success "Database connection successful"
        return 0
    else
        log_error "Database connection failed"
        return 1
    fi
}

# Function to backup database
backup_database() {
    log_info "Creating database backup..."
    
    BACKUP_DIR="./backups"
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/pre_migration_backup_$(date +%Y%m%d_%H%M%S)"
    
    if sudo docker exec mongodb-test mongodump --db flowise_proxy_test --out /tmp/backup && \
       sudo docker cp mongodb-test:/tmp/backup "$BACKUP_FILE"; then
        log_success "Backup created: $BACKUP_FILE"
        return 0
    else
        log_warning "Backup failed (continuing anyway)"
        return 1
    fi
}

# Function to run migration
run_migration() {
    log_info "Running database migration..."
    
    # Method 1: Try running in existing flowise container
    if [[ -n "$FLOWISE_CONTAINER" ]]; then
        log_info "Method 1: Running migration in Flowise container"
        if sudo docker exec "$FLOWISE_CONTAINER" python migrations/run_migrations.py --all; then
            log_success "Migration completed successfully!"
            return 0
        else
            log_warning "Migration failed in Flowise container, trying alternative method..."
        fi
    fi
    
    # Method 2: Run migration with temporary container using the same network
    log_info "Method 2: Running migration with temporary container"
    
    # Set environment variables
    export MONGODB_URL="mongodb://admin:password@mongodb-test:27017/flowise_proxy_test?authSource=admin"
    export MONGODB_DATABASE_NAME="flowise_proxy_test"
    
    if sudo docker run --rm \
        --network flowise-proxy-service-py_test-network \
        --network flowise-proxy-service-py_auth-network \
        --network flowise-proxy-service-py_accounting-network \
        -v "$(pwd):/app" \
        -w /app \
        -e MONGODB_URL="$MONGODB_URL" \
        -e MONGODB_DATABASE_NAME="$MONGODB_DATABASE_NAME" \
        python:3.11 \
        bash -c "pip install -r requirements.txt && python migrations/run_migrations.py --all"; then
        log_success "Migration completed with temporary container!"
        return 0
    else
        log_error "Migration failed with temporary container"
    fi
    
    # Method 3: Direct host execution (if Python available)
    log_info "Method 3: Trying host-based migration"
    if command -v python3 &> /dev/null; then
        export MONGODB_URL="mongodb://admin:password@localhost:27020/flowise_proxy_test?authSource=admin"
        export MONGODB_DATABASE_NAME="flowise_proxy_test"
        
        if python3 migrations/run_migrations.py --all; then
            log_success "Migration completed on host!"
            return 0
        else
            log_error "Migration failed on host"
        fi
    else
        log_warning "Python3 not available on host"
    fi
    
    return 1
}

# Function to verify migration
verify_migration() {
    log_info "Verifying migration results..."
    
    # Check database collections
    sudo docker exec mongodb-test mongosh --eval "
        use flowise_proxy_test;
        print('=== Migration Verification ===');
        print('Database: ' + db.getName());
        print('Collections:');
        db.getCollectionNames().forEach(function(name) {
            var count = db.getCollection(name).countDocuments();
            print('  - ' + name + ': ' + count + ' documents');
        });
    " --quiet | tee -a "$LOG_FILE"
    
    # Check if Flowise service is responding
    if [[ -n "$FLOWISE_CONTAINER" ]]; then
        log_info "Checking API health..."
        if curl -f -s "http://localhost:8000/health" > /dev/null 2>&1; then
            log_success "API health check passed"
        else
            log_warning "API not responding (may still be starting)"
        fi
    fi
}

# Function to show final status
show_final_status() {
    log_info "=== Final Status ==="
    
    # Show container status
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(flowise|mongodb)" | tee -a "$LOG_FILE"
    
    # Show service URLs
    if docker ps --format "{{.Names}}\t{{.Ports}}" | grep "flowise-proxy-test" | grep -q "8000"; then
        log_success "Flowise Proxy available at: http://localhost:8000"
    fi
    
    if docker ps --format "{{.Names}}\t{{.Ports}}" | grep "mongodb-test" | grep -q "27020"; then
        log_info "MongoDB available at: localhost:27020"
    fi
    
    log_info "Migration log saved: $LOG_FILE"
}

# Main execution
main() {
    log_info "Starting production migration for Linux Docker environment"
    log_info "Using compose file: $COMPOSE_FILE"
    
    # Check if we're in the right directory
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        log_error "docker-compose.linux.yml not found! Please run this script from the flowise-proxy-service-py directory."
        exit 1
    fi
    
    # Step 1: Ensure services are running
    ensure_services_running
    
    # Step 2: Check containers
    if ! check_containers; then
        log_error "Required containers not found. Please check your Docker setup."
        exit 1
    fi
    
    # Step 3: Test database
    if ! test_database; then
        log_error "Database not accessible. Cannot proceed with migration."
        exit 1
    fi
    
    # Step 4: Backup (optional)
    read -p "Create database backup before migration? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        backup_database
    fi
    
    # Step 5: Run migration
    if run_migration; then
        log_success "🎉 Migration completed successfully!"
        
        # Step 6: Verify
        verify_migration
        
        # Step 7: Show status
        show_final_status
        
        log_success "✨ Production migration completed! Your system is ready."
    else
        log_error "💥 Migration failed! Please check the logs and try again."
        log_info "Log file: $LOG_FILE"
        exit 1
    fi
}

# Execute main function
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
