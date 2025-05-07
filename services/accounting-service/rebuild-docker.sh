#!/bin/bash
# rebuild-docker.sh
# Script to rebuild the accounting service Docker containers

# Text colors
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}Accounting Service Docker Rebuild Script${NC}"
echo -e "${CYAN}==========================================${NC}"

# Function to check if a service is running by checking its health endpoint
check_service_health() {
    local service_name=$1
    local service_url=$2
    
    echo -e "${YELLOW}Checking $service_name service at $service_url...${NC}"
    
    if curl -s -f "$service_url/health" > /dev/null; then
        echo -e "${GREEN}$service_name is running ✅${NC}"
        return 0
    else
        echo -e "${RED}$service_name is not running ❌${NC}"
        return 1
    fi
}

# Define service URLs
AUTH_SERVICE_URL="http://localhost:3000"
ACCOUNTING_SERVICE_URL="http://localhost:3001"

# Get the directory of the current script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
SERVICE_DIR="$SCRIPT_DIR"
ROOT_DIR="$(dirname "$(dirname "$SERVICE_DIR")")"
AUTH_DIR="$ROOT_DIR/authentication-service"

# Navigate to the service directory
cd "$SERVICE_DIR"
echo -e "${YELLOW}Working directory: $SERVICE_DIR${NC}"

# Check if Docker is running
echo -e "${CYAN}Checking if Docker is running...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "\n${RED}Docker is not running. Please start Docker before continuing.${NC}"
    read -p "Press Enter to exit"
    exit 1
else
    echo -e "${GREEN}Docker is running properly.${NC}"
fi

# Check if services are running before rebuild
echo -e "\n${CYAN}Checking services status before rebuild:${NC}"
check_service_health "Authentication" "$AUTH_SERVICE_URL"
auth_running=$?

check_service_health "Accounting" "$ACCOUNTING_SERVICE_URL"
accounting_running=$?

# Function to start a service if not running
start_docker_service() {
    local service_name=$1
    local service_dir=$2
    local wait_for_startup=$3
    
    echo -e "\n${CYAN}Starting $service_name service...${NC}"
    
    if [ -f "$service_dir/docker-compose.yml" ]; then
        # Change to the service directory
        pushd "$service_dir" > /dev/null
        
        # Start the service using Docker Compose
        echo -e "${YELLOW}Running docker-compose up in $service_dir${NC}"
        
        if [ "$wait_for_startup" == "true" ]; then
            docker-compose up -d
            echo -e "${YELLOW}Waiting for $service_name to start...${NC}"
            sleep 10
        else
            docker-compose up -d &
        fi
        
        echo -e "${GREEN}$service_name service started successfully${NC}"
        
        # Return to the original directory
        popd > /dev/null
    else
        echo -e "${RED}docker-compose.yml not found in $service_dir${NC}"
    fi
}

# Make sure dependencies are running (Auth)
dependencies_started=false

# Start Authentication if not running (needed for shared network)
if [ $auth_running -ne 0 ]; then
    echo -e "\n${YELLOW}Authentication service is not running but is required.${NC}"
    read -p "Do you want to start Authentication service? (y/n) " start_auth
    
    if [ "$start_auth" == "y" ]; then
        start_docker_service "Authentication" "$AUTH_DIR" "true"
        dependencies_started=true
        check_service_health "Authentication" "$AUTH_SERVICE_URL"
        auth_running=$?
    fi
fi

# Return to accounting service directory if we started dependencies
if [ "$dependencies_started" == true ]; then
    cd "$SERVICE_DIR"
fi

# Stop existing containers
echo -e "\n${YELLOW}Stopping existing accounting service containers...${NC}"
docker-compose down

# Ask about removing volumes
read -p "Do you want to remove database volumes? This will delete all data (y/n) " remove_volumes
if [ "$remove_volumes" == "y" ]; then
    echo -e "${CYAN}Removing Docker volumes...${NC}"
    docker volume rm $(docker volume ls -q --filter name=accounting-service_postgres-data) 2>/dev/null
fi

# Rebuild and start the containers
echo -e "\n${YELLOW}Rebuilding and starting accounting service containers...${NC}"
docker-compose up -d --build

# Wait for services to start
echo -e "\n${YELLOW}Waiting for services to start...${NC}"
sleep 10

# Check if services are running after rebuild
echo -e "\n${CYAN}Checking services status after rebuild:${NC}"
check_service_health "Authentication" "$AUTH_SERVICE_URL"
auth_running=$?

check_service_health "Accounting" "$ACCOUNTING_SERVICE_URL"
accounting_running=$?

# Final status report
echo -e "\n${CYAN}Final services status:${NC}"
if [ $auth_running -eq 0 ]; then
    echo -e "${GREEN}Authentication: Running ✅${NC}"
else
    echo -e "${RED}Authentication: Not running ❌${NC}"
fi

if [ $accounting_running -eq 0 ]; then
    echo -e "${GREEN}Accounting: Running ✅${NC}"
    echo -e "\n${GREEN}Accounting service was rebuilt and started successfully at http://localhost:3001${NC}"
else
    echo -e "${RED}Accounting: Not running ❌${NC}"
    echo -e "\n${RED}Failed to rebuild Accounting service. Please check the logs for errors.${NC}"
fi

echo -e "\n${CYAN}To view logs, run: docker-compose logs -f${NC}"