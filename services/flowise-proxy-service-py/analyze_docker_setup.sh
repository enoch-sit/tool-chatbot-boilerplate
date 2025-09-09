#!/bin/bash

# Docker Setup Analysis Script
# This script analyzes your Docker setup and provides MongoDB connection information

echo "=========================================="
echo "🔍 Docker Setup Analysis"
echo "=========================================="

# Function to analyze Docker containers
analyze_containers() {
    echo ""
    echo "📋 Current Docker Containers:"
    echo "----------------------------------------"
    
    if ! docker ps > /dev/null 2>&1; then
        echo "❌ Docker is not running or not accessible"
        echo "   Please start Docker and try again"
        exit 1
    fi
    
    # Show all containers in a nice format
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}"
    echo ""
    
    # Count containers
    CONTAINER_COUNT=$(docker ps --format "{{.Names}}" | wc -l)
    echo "📊 Total running containers: $CONTAINER_COUNT"
    echo ""
}

# Function to analyze MongoDB containers specifically
analyze_mongodb() {
    echo "🔍 MongoDB Container Analysis:"
    echo "----------------------------------------"
    
    # Find MongoDB containers
    MONGO_CONTAINERS=$(docker ps --format "{{.Names}}\t{{.Image}}\t{{.Ports}}" | grep -i mongo || true)
    
    if [ -n "$MONGO_CONTAINERS" ]; then
        echo "✅ Found MongoDB containers:"
        echo ""
        
        echo "$MONGO_CONTAINERS" | while IFS=$'\t' read -r name image ports; do
            echo "📦 Container: $name"
            echo "   Image: $image"
            echo "   Ports: $ports"
            
            # Extract port mapping
            if [[ $ports =~ ([0-9]+):27017 ]]; then
                HOST_PORT="${BASH_REMATCH[1]}"
                echo "   🔌 Host Port: $HOST_PORT"
                echo "   💡 Connection: localhost:$HOST_PORT"
            fi
            
            echo ""
        done
    else
        echo "❌ No MongoDB containers found"
        echo ""
    fi
}

# Function to suggest connection strings
suggest_connections() {
    echo "💡 Suggested MongoDB Connection Strings:"
    echo "----------------------------------------"
    
    # Common patterns based on container names
    if docker ps --format "{{.Names}}" | grep -q "mongodb-test"; then
        echo "🧪 Test Environment (mongodb-test):"
        echo "   mongodb://admin:password@localhost:27020/flowise_proxy_test?authSource=admin"
        echo ""
    fi
    
    if docker ps --format "{{.Names}}" | grep -q "mongodb-prod"; then
        echo "🏭 Production Environment (mongodb-prod):"
        echo "   mongodb://admin:password@localhost:27017/flowise_proxy?authSource=admin"
        echo ""
    fi
    
    if docker ps --format "{{.Names}}" | grep -q "mongo"; then
        echo "🔧 Generic MongoDB container:"
        echo "   mongodb://localhost:27017/your_database_name"
        echo ""
    fi
}

# Function to check environment files
check_env_files() {
    echo "📄 Environment Files Analysis:"
    echo "----------------------------------------"
    
    if [ -f ".env" ]; then
        echo "✅ Found .env file"
        if grep -q "MONGODB_URL" .env; then
            echo "   📝 MongoDB configuration found:"
            grep "MONGODB" .env | sed 's/^/      /'
        fi
        echo ""
    fi
    
    if [ -f ".env.test" ]; then
        echo "✅ Found .env.test file"
        if grep -q "MONGODB_URL" .env.test; then
            echo "   📝 Test MongoDB configuration found:"
            grep "MONGODB" .env.test | sed 's/^/      /'
        fi
        echo ""
    fi
    
    if [ -f ".env.prod" ]; then
        echo "✅ Found .env.prod file"
        if grep -q "MONGODB_URL" .env.prod; then
            echo "   📝 Production MongoDB configuration found:"
            grep "MONGODB" .env.prod | sed 's/^/      /'
        fi
        echo ""
    fi
}

# Function to analyze Docker Compose files
analyze_docker_compose() {
    echo "🐳 Docker Compose Analysis:"
    echo "----------------------------------------"
    
    if [ -f "docker-compose.yml" ]; then
        echo "✅ Found docker-compose.yml"
        if grep -q "mongodb" docker-compose.yml; then
            echo "   📝 MongoDB service configuration:"
            grep -A 10 -B 2 "mongodb" docker-compose.yml | sed 's/^/      /'
        fi
        echo ""
    fi
    
    if [ -f "docker-compose.linux.yml" ]; then
        echo "✅ Found docker-compose.linux.yml"
        if grep -q "mongodb" docker-compose.linux.yml; then
            echo "   📝 MongoDB service configuration:"
            grep -A 10 -B 2 "mongodb" docker-compose.linux.yml | sed 's/^/      /'
        fi
        echo ""
    fi
    
    if [ -f "docker-compose.prod.yml" ]; then
        echo "✅ Found docker-compose.prod.yml"
        if grep -q "mongodb" docker-compose.prod.yml; then
            echo "   📝 MongoDB service configuration:"
            grep -A 10 -B 2 "mongodb" docker-compose.prod.yml | sed 's/^/      /'
        fi
        echo ""
    fi
}

# Function to provide usage instructions
show_usage_instructions() {
    echo "🚀 Next Steps:"
    echo "----------------------------------------"
    echo "1. Copy the appropriate MongoDB connection string from above"
    echo "2. Set environment variables:"
    echo "   export MONGODB_URL=\"your_connection_string\""
    echo "   export MONGODB_DATABASE_NAME=\"your_database_name\""
    echo ""
    echo "3. Run the migration:"
    echo "   ./migrate_production.sh"
    echo ""
    echo "4. Or run migration directly:"
    echo "   python migrations/run_migrations.py --all"
    echo ""
    echo "💡 Tips:"
    echo "   • Use localhost for host when connecting from outside containers"
    echo "   • Use container names for host when running inside Docker network"
    echo "   • Check port mappings in docker-compose.yml files"
    echo "   • Default MongoDB credentials are usually admin/password"
    echo ""
}

# Main execution
main() {
    analyze_containers
    analyze_mongodb
    suggest_connections
    check_env_files
    analyze_docker_compose
    show_usage_instructions
}

# Run main function
main "$@"
