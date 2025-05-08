#!/bin/bash
# start-docker.sh
# Script to start the chat service Docker containers

echo -e "\033[0;36m=========================================\033[0m"
echo -e "\033[0;36mChat Service Docker Start Script\033[0m"
echo -e "\033[0;36m=========================================\033[0m"

# Check if Docker is running
echo -e "\n\033[0;33mChecking if Docker is running...\033[0m"
if ! docker info > /dev/null 2>&1; then
    echo -e "\033[0;31mDocker is not running. Please start Docker before continuing.\033[0m"
    read -p "Press Enter to exit"
    exit 1
else
    echo -e "\033[0;32mDocker is running properly.\033[0m"
fi

# Get service directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHAT_SERVICE_DIR="$SCRIPT_DIR"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
AUTH_SERVICE_DIR="$ROOT_DIR/authentication-service"
ACCOUNTING_SERVICE_DIR="$ROOT_DIR/accounting-service"

# Start services in order
echo -e "\n\033[0;36mStarting services in order: Authentication -> Accounting -> Chat...\033[0m"

# Start Authentication Service (if it exists)
if [ -f "$AUTH_SERVICE_DIR/docker-compose.yml" ]; then
    echo -e "\n\033[0;33mStarting Authentication Service...\033[0m"
    cd "$AUTH_SERVICE_DIR"
    docker-compose up -d
    echo -e "\033[0;32mAuthentication Service started. Waiting for initialization...\033[0m"
    sleep 10
fi

# Start Accounting Service (if it exists)
if [ -f "$ACCOUNTING_SERVICE_DIR/docker-compose.yml" ]; then
    echo -e "\n\033[0;33mStarting Accounting Service...\033[0m"
    cd "$ACCOUNTING_SERVICE_DIR"
    docker-compose up -d
    echo -e "\033[0;32mAccounting Service started. Waiting for initialization...\033[0m"
    sleep 10
fi

# Start Chat Service
echo -e "\n\033[0;33mStarting Chat Service...\033[0m"
cd "$CHAT_SERVICE_DIR"
docker-compose up -d

echo -e "\n\033[0;32mAll services have been started!\033[0m"
echo -e "\033[0;36mChat service should be available at http://localhost:3002\033[0m"
echo -e "\033[0;36mGrafana dashboard available at http://localhost:3003\033[0m"
echo -e "\033[0;36mTo view logs, use: docker-compose logs -f\033[0m"

# Return to scripts directory
cd "$SCRIPT_DIR"