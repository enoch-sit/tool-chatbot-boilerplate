#!/bin/bash
# simple-start-docker.sh
# A simplified script to start the chat service Docker containers

echo -e "\033[0;36m=========================================\033[0m"
echo -e "\033[0;36mChat Service Simple Docker Start Script\033[0m"
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

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Start Chat Service
echo -e "\n\033[0;33mStarting Chat Service...\033[0m"
cd "$SCRIPT_DIR"
docker-compose up -d

echo -e "\n\033[0;32mChat service has been started!\033[0m"
echo -e "\033[0;36mChat service should be available at http://localhost:3002\033[0m"
echo -e "\033[0;36mGrafana dashboard available at http://localhost:3003\033[0m"
echo -e "\033[0;36mTo view logs, use: docker-compose logs -f\033[0m"

# Return to scripts directory
cd "$SCRIPT_DIR"