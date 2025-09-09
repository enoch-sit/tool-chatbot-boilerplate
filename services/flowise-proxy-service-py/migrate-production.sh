#!/bin/bash

# Production Database Migration Script
# Automatically detects Docker environment and runs migrations accordingly

set -e  # Exit on any error

echo "=========================================="
echo "🚀 Production Database Migration Script"
echo "=========================================="

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/migration-$(date +%Y%m%d_%H%M%S).log"
COMPOSE_FILE="docker-compose.linux.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

log_info() {
    log "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    log "${GREEN}✅ $1${NC}"
}

log_warning() {
    log "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    log "${RED}❌ $1${NC}"
}

# Function to detect running containers
detect_containers() {
    log_info "Detecting current Docker environment..."
    
    # Check for flowise-proxy containers
    FLOWISE_CONTAINERS=$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(flowise-proxy|flowise_proxy)" || true)
    
    # Check for MongoDB containers
    MONGODB_CONTAINERS=$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(mongodb|mongo)" || true)
    
    if [[ -n "$FLOWISE_CONTAINERS" ]]; then
        log_info "Found Flowise proxy containers:"
        echo "$FLOWISE_CONTAINERS" | tee -a "$LOG_FILE"
    fi
    
    if [[ -n "$MONGODB_CONTAINERS" ]]; then
        log_info "Found MongoDB containers:"
        echo "$MONGODB_CONTAINERS" | tee -a "$LOG_FILE"
    fi
    
    # Detect specific container names
    FLOWISE_CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep -E "(flowise-proxy-test|flowise-proxy-production)" | head -1 || true)
    MONGODB_CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep -E "(mongodb-test|mongodb-production|auth-mongodb)" | head -1 || true)
    
    log_info "Detected containers:"
    log_info "  Flowise container: ${FLOWISE_CONTAINER_NAME:-'None found'}"
    log_info "  MongoDB container: ${MONGODB_CONTAINER_NAME:-'None found'}"
}

# Function to determine database connection details
get_db_connection() {
    if [[ -n "$MONGODB_CONTAINER_NAME" ]]; then
        case "$MONGODB_CONTAINER_NAME" in
            "mongodb-test")
                DB_HOST="mongodb-test"
                DB_PORT="27017"
                DB_USER="admin"
                DB_PASS="password"
                DB_NAME="flowise_proxy_test"
                ;;
            "mongodb-production")
                DB_HOST="mongodb-production"
                DB_PORT="27017"
                DB_USER="admin"
                DB_PASS="YOUR_PROD_PASSWORD"  # This should be updated for production
                DB_NAME="flowise_proxy_production"
                ;;
            "auth-mongodb-samehost")
                DB_HOST="auth-mongodb-samehost"
                DB_PORT="27017"
                DB_USER="admin"
                DB_PASS="password"  # This might need to be updated
                DB_NAME="flowise_proxy_production"
                ;;
            *)
                log_warning "Unknown MongoDB container: $MONGODB_CONTAINER_NAME"
                DB_HOST="localhost"
                DB_PORT="27017"
                DB_USER="admin"
                DB_PASS="password"
                DB_NAME="flowise_proxy_production"
                ;;
        esac
    else
        log_error "No MongoDB container found!"
        exit 1
    fi
    
    # Check if we need to use external port (for host connections)
    EXTERNAL_MONGO_PORT=$(docker port "$MONGODB_CONTAINER_NAME" 27017 2>/dev/null | cut -d: -f2 || echo "")
    
    if [[ -n "$EXTERNAL_MONGO_PORT" ]]; then
        MONGODB_URL="mongodb://$DB_USER:$DB_PASS@localhost:$EXTERNAL_MONGO_PORT/$DB_NAME?authSource=admin"
        log_info "Using external MongoDB port: $EXTERNAL_MONGO_PORT"
    else
        MONGODB_URL="mongodb://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME?authSource=admin"
        log_info "Using internal MongoDB connection"
    fi
    
    export MONGODB_URL
    export MONGODB_DATABASE_NAME="$DB_NAME"
    
    log_info "Database connection: $MONGODB_URL"
}

# Function to test database connection
test_db_connection() {
    log_info "Testing database connection..."
    
    if docker exec "$MONGODB_CONTAINER_NAME" mongosh --eval "db.runCommand('ping')" --quiet > /dev/null 2>&1; then
        log_success "Database connection successful"
        return 0
    else
        log_error "Database connection failed"
        return 1
    fi
}

# Function to run migration in container
run_migration_in_container() {
    log_info "Running migration inside Flowise container..."
    
    if docker exec "$FLOWISE_CONTAINER_NAME" python migrations/run_migrations.py --all; then
        log_success "Migration completed successfully in container"
        return 0
    else
        log_error "Migration failed in container"
        return 1
    fi
}

# Function to run migration with temporary container
run_migration_with_temp_container() {
    log_info "Running migration with temporary container..."
    
    # Get the network names from the running containers
    NETWORKS=$(docker inspect "$FLOWISE_CONTAINER_NAME" --format='{{range $key, $value := .NetworkSettings.Networks}}{{$key}} {{end}}' 2>/dev/null || echo "")
    
    if [[ -z "$NETWORKS" ]]; then
        # Fallback to common network names
        NETWORKS="flowise-proxy-service-py_test-network"
    fi
    
    NETWORK_FLAGS=""
    for network in $NETWORKS; do
        if docker network ls | grep -q "$network"; then
            NETWORK_FLAGS="$NETWORK_FLAGS --network $network"
        fi
    done
    
    log_info "Using networks: $NETWORKS"
    
    # Run migration in temporary container
    if docker run --rm \
        $NETWORK_FLAGS \
        -v "$SCRIPT_DIR:/app" \
        -w /app \
        -e MONGODB_URL="$MONGODB_URL" \
        -e MONGODB_DATABASE_NAME="$MONGODB_DATABASE_NAME" \
        python:3.11 \
        bash -c "pip install -r requirements.txt && python migrations/run_migrations.py --all"; then
        log_success "Migration completed successfully with temporary container"
        return 0
    else
        log_error "Migration failed with temporary container"
        return 1
    fi
}

# Function to run migration on host (if Python is available)
run_migration_on_host() {
    log_info "Running migration on host..."
    
    if command -v python3 &> /dev/null; then
        if python3 migrations/run_migrations.py --all; then
            log_success "Migration completed successfully on host"
            return 0
        else
            log_error "Migration failed on host"
            return 1
        fi
    else
        log_warning "Python3 not available on host"
        return 1
    fi
}

# Function to backup database before migration
backup_database() {
    log_info "Creating database backup before migration..."
    
    BACKUP_DIR="$SCRIPT_DIR/backups"
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).gz"
    
    if docker exec "$MONGODB_CONTAINER_NAME" mongodump --db "$DB_NAME" --gzip --archive > "$BACKUP_FILE"; then
        log_success "Database backup created: $BACKUP_FILE"
        return 0
    else
        log_warning "Database backup failed (continuing anyway)"
        return 1
    fi
}

# Function to verify migration success
verify_migration() {
    log_info "Verifying migration success..."
    
    # Check if we can connect to the API (if container is running)
    if [[ -n "$FLOWISE_CONTAINER_NAME" ]]; then
        # Get the external port for the Flowise container
        EXTERNAL_PORT=$(docker port "$FLOWISE_CONTAINER_NAME" 8000 2>/dev/null | cut -d: -f2 || echo "")
        
        if [[ -n "$EXTERNAL_PORT" ]]; then
            if curl -f -s "http://localhost:$EXTERNAL_PORT/health" > /dev/null 2>&1; then
                log_success "API health check passed"
            else
                log_warning "API health check failed (service might still be starting)"
            fi
        fi
    fi
    
    # Check database collections
    if docker exec "$MONGODB_CONTAINER_NAME" mongosh --eval "
        use $DB_NAME;
        db.runCommand('listCollections').cursor.firstBatch.forEach(
            function(collection) { 
                print('Collection: ' + collection.name); 
            }
        );
    " --quiet > /dev/null 2>&1; then
        log_success "Database verification passed"
    else
        log_warning "Database verification failed"
    fi
}

# Main execution function
main() {
    log_info "Starting production migration process..."
    log_info "Script directory: $SCRIPT_DIR"
    log_info "Log file: $LOG_FILE"
    
    # Change to script directory
    cd "$SCRIPT_DIR"
    
    # Step 1: Detect containers
    detect_containers
    
    if [[ -z "$MONGODB_CONTAINER_NAME" ]]; then
        log_error "No MongoDB container found. Please start your Docker services first."
        exit 1
    fi
    
    # Step 2: Get database connection details
    get_db_connection
    
    # Step 3: Test database connection
    if ! test_db_connection; then
        log_error "Cannot connect to database. Aborting migration."
        exit 1
    fi
    
    # Step 4: Create backup (optional, but recommended)
    read -p "Do you want to create a database backup before migration? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        backup_database
    fi
    
    # Step 5: Run migration
    log_info "Starting database migration..."
    
    MIGRATION_SUCCESS=false
    
    # Try different migration methods in order of preference
    if [[ -n "$FLOWISE_CONTAINER_NAME" ]] && docker exec "$FLOWISE_CONTAINER_NAME" test -f migrations/run_migrations.py 2>/dev/null; then
        log_info "Method 1: Running migration inside existing Flowise container"
        if run_migration_in_container; then
            MIGRATION_SUCCESS=true
        fi
    fi
    
    if [[ "$MIGRATION_SUCCESS" == "false" ]]; then
        log_info "Method 2: Running migration with temporary container"
        if run_migration_with_temp_container; then
            MIGRATION_SUCCESS=true
        fi
    fi
    
    if [[ "$MIGRATION_SUCCESS" == "false" ]]; then
        log_info "Method 3: Running migration on host"
        if run_migration_on_host; then
            MIGRATION_SUCCESS=true
        fi
    fi
    
    # Step 6: Verify results
    if [[ "$MIGRATION_SUCCESS" == "true" ]]; then
        log_success "Migration completed successfully!"
        verify_migration
    else
        log_error "All migration methods failed!"
        exit 1
    fi
    
    # Step 7: Final status
    log_info "Migration process completed."
    log_info "Log file saved: $LOG_FILE"
    
    if [[ -n "$FLOWISE_CONTAINER_NAME" ]]; then
        EXTERNAL_PORT=$(docker port "$FLOWISE_CONTAINER_NAME" 8000 2>/dev/null | cut -d: -f2 || echo "8000")
        log_info "Your application should be available at: http://localhost:$EXTERNAL_PORT"
    fi
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
