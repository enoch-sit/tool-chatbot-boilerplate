#!/bin/bash
# start-docker.sh
# Script to start the chat service Docker containers

# Text colors
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

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
CHAT_SERVICE_URL="http://localhost:3002"

# Check if Docker is running
echo -e "${CYAN}Checking if Docker is running...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "\n${RED}Docker is not running. Please start Docker before continuing.${NC}"
    read -p "Press Enter to exit"
    exit 1
fi

# Check if services are running
check_service_health "Authentication" "$AUTH_SERVICE_URL"
auth_running=$?

check_service_health "Accounting" "$ACCOUNTING_SERVICE_URL"
accounting_running=$?

check_service_health "Chat" "$CHAT_SERVICE_URL"
chat_running=$?

# Print services status
echo -e "\n${CYAN}Services status:${NC}"
if [ $auth_running -eq 0 ]; then
    echo -e "${GREEN}Authentication: Running ✅${NC}"
else
    echo -e "${RED}Authentication: Not running ❌${NC}"
fi

if [ $accounting_running -eq 0 ]; then
    echo -e "${GREEN}Accounting: Running ✅${NC}"
else
    echo -e "${RED}Accounting: Not running ❌${NC}"
fi

if [ $chat_running -eq 0 ]; then
    echo -e "${GREEN}Chat: Running ✅${NC}"
else
    echo -e "${RED}Chat: Not running ❌${NC}"
fi

# Get the path to the service directories
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$(dirname "$SERVICE_DIR")")"
AUTH_DIR="$ROOT_DIR/authentication-service"
ACCOUNTING_DIR="$ROOT_DIR/accounting-service"
CHAT_DIR="$SERVICE_DIR"

# Function to start a service using docker-compose
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

# Services need to be started in order: Authentication -> Accounting -> Chat
services_started=false

# Start Authentication if not running (needed for shared network)
if [ $auth_running -ne 0 ]; then
    start_docker_service "Authentication" "$AUTH_DIR" "true"
    services_started=true
    
    # Check again if service is running
    check_service_health "Authentication" "$AUTH_SERVICE_URL"
    auth_running=$?
fi

# Start Accounting if not running
if [ $accounting_running -ne 0 ]; then
    start_docker_service "Accounting" "$ACCOUNTING_DIR" "true"
    services_started=true
    
    # Check again if service is running
    check_service_health "Accounting" "$ACCOUNTING_SERVICE_URL"
    accounting_running=$?
fi

# Start Chat if not running
if [ $chat_running -ne 0 ]; then
    start_docker_service "Chat" "$CHAT_DIR" "true"
    services_started=true
    
    # Check again if service is running
    check_service_health "Chat" "$CHAT_SERVICE_URL"
    chat_running=$?
fi

# Final status check
echo -e "\n${CYAN}Final services status:${NC}"
if [ $auth_running -eq 0 ]; then
    echo -e "${GREEN}Authentication: Running ✅${NC}"
else
    echo -e "${RED}Authentication: Not running ❌${NC}"
fi

if [ $accounting_running -eq 0 ]; then
    echo -e "${GREEN}Accounting: Running ✅${NC}"
else
    echo -e "${RED}Accounting: Not running ❌${NC}"
fi

if [ $chat_running -eq 0 ]; then
    echo -e "${GREEN}Chat: Running ✅${NC}"
else
    echo -e "${RED}Chat: Not running ❌${NC}"
fi

# Summary message
if [ $chat_running -eq 0 ]; then
    echo -e "\n${GREEN}Chat service is running successfully at http://localhost:3002${NC}"
    echo -e "${CYAN}To view logs, run: docker-compose logs -f${NC}"
else
    echo -e "\n${RED}Failed to start Chat service. Please check the errors above.${NC}"
fi