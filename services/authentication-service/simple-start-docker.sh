#!/bin/bash
# simple-start-docker.sh
# A simplified script to start the authentication service Docker containers

# Text colors
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}Authentication Service Simple Docker Start Script${NC}"
echo -e "${CYAN}==========================================${NC}"

# Check if Docker is running
echo -e "\n${YELLOW}Checking if Docker is running...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Docker is not running. Please start Docker before continuing.${NC}"
    read -p "Press Enter to exit"
    exit 1
else
    echo -e "${GREEN}Docker is running properly.${NC}"
fi

# Get service directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
AUTH_SERVICE_DIR="$SCRIPT_DIR"

# Start Authentication Service
echo -e "\n${YELLOW}Starting Authentication Service...${NC}"
cd "$AUTH_SERVICE_DIR"
docker-compose up -d

echo -e "\n${GREEN}Authentication service has been started!${NC}"
echo -e "${CYAN}Authentication service should be available at http://localhost:3000${NC}"
echo -e "${CYAN}To view logs, use: docker-compose logs -f${NC}"

# Return to original directory
cd "$SCRIPT_DIR"