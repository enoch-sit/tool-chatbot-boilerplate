#!/bin/bash
# This script checks if the required services are running and starts them if needed

echo -e "\033[36mChecking if required services are running...\033[0m"

# Configuration
AUTH_SERVICE_URL="http://localhost:3000"
ACCOUNTING_SERVICE_URL="http://localhost:3001"
CHAT_SERVICE_URL="http://localhost:3002"

# Function to check if a service is running
check_service_health() {
    local service_name=$1
    local service_url=$2
    
    echo -e "\033[33mChecking $service_name service at $service_url...\033[0m"
    
    # Use curl to check service health
    if curl -s -o /dev/null -w "%{http_code}" "$service_url/health" -m 5 | grep -q "200"; then
        echo -e "\033[32m$service_name is running ✅\033[0m"
        return 0
    else
        echo -e "\033[31m$service_name is not running ❌\033[0m"
        return 1
    fi
}

# Check if services are running
check_service_health "Authentication" "$AUTH_SERVICE_URL"
auth_running=$?

check_service_health "Accounting" "$ACCOUNTING_SERVICE_URL"
accounting_running=$?

check_service_health "Chat" "$CHAT_SERVICE_URL"
chat_running=$?

# Convert exit codes to boolean (0=true, 1=false)
auth_running=$((auth_running == 0))
accounting_running=$((accounting_running == 0))
chat_running=$((chat_running == 0))

# Get the path to the service directories
current_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
root_dir="$(dirname "$(dirname "$current_dir")")"
auth_dir="$root_dir/authentication-service"
accounting_dir="$root_dir/accounting-service"
chat_dir="$root_dir/chat-service"

# Function to start a service using docker-compose
start_docker_service() {
    local service_name=$1
    local service_dir=$2
    local wait_for_startup=$3
    
    echo -e "\n\033[36mStarting $service_name service...\033[0m"
    
    if [ -f "$service_dir/docker-compose.yml" ]; then
        # Change to the service directory
        pushd "$service_dir" > /dev/null
        
        # Start the service using Docker Compose
        echo -e "\033[33mRunning docker-compose up in $service_dir\033[0m"
        
        if [ "$wait_for_startup" == "true" ]; then
            docker-compose up -d
            echo -e "\033[33mWaiting for $service_name to start...\033[0m"
            sleep 10
        else
            docker-compose up -d &
        fi
        
        echo -e "\033[32m$service_name service started successfully\033[0m"
        
        # Return to the original directory
        popd > /dev/null
    else
        echo -e "\033[31mdocker-compose.yml not found in $service_dir\033[0m"
    fi
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "\n\033[31mDocker is not running. Please start Docker before continuing.\033[0m"
    read -p "Press Enter to exit"
    exit 1
fi

# Start services if they're not running
services_started=false

# Always start Authentication first as it's required by other services
if [ $auth_running -eq 0 ]; then
    start_docker_service "Authentication" "$auth_dir" "true"
    services_started=true
    
    # Check again if service is running
    check_service_health "Authentication" "$AUTH_SERVICE_URL"
    auth_running=$((auth_running == 0))
fi

# For Auth-Accounting tests, we need only these two services
if [ $accounting_running -eq 0 ]; then
    start_docker_service "Accounting" "$accounting_dir" "true"
    services_started=true
    
    # Check again if service is running
    check_service_health "Accounting" "$ACCOUNTING_SERVICE_URL"
    accounting_running=$((accounting_running == 0))
fi

# For full workflow tests, we need Chat service too
if [ $chat_running -eq 0 ]; then
    start_docker_service "Chat" "$chat_dir" "false"
    services_started=true
fi

# Final status check
echo -e "\n\033[36mServices status:\033[0m"
if [ $auth_running -eq 1 ]; then
    echo -e "\033[32mAuthentication: Running ✅\033[0m"
else
    echo -e "\033[31mAuthentication: Not running ❌\033[0m"
fi

if [ $accounting_running -eq 1 ]; then
    echo -e "\033[32mAccounting: Running ✅\033[0m"
else
    echo -e "\033[31mAccounting: Not running ❌\033[0m"
fi

if [ $chat_running -eq 1 ]; then
    echo -e "\033[32mChat: Running ✅\033[0m"
else
    echo -e "\033[33mChat: Not running (may not be needed for Auth-Accounting tests)\033[0m"
fi

# Prompt user for action based on service status
if [ $auth_running -eq 1 ] && [ $accounting_running -eq 1 ]; then
    echo -e "\n\033[32mReady to run Auth-Accounting workflow tests.\033[0m"
    
    if [ $chat_running -eq 1 ]; then
        echo -e "\033[32mAll services are running. Ready to run full workflow tests.\033[0m"
    else
        echo -e "\033[33mChat service is not running. You can only run Auth-Accounting tests.\033[0m"
    fi
    
    echo -e "\n\033[36mWhat would you like to do?\033[0m"
    echo "1. Run Auth-Accounting workflow test"
    echo "2. Run full workflow test (requires Chat service)"
    echo "3. Exit"
    
    read -p $'\nEnter your choice (1-3): ' choice
    
    case $choice in
        1)
            echo -e "\n\033[36mRunning Auth-Accounting workflow test...\033[0m"
            ./start.sh 2
            ;;
        2)
            if [ $chat_running -eq 1 ]; then
                echo -e "\n\033[36mRunning full workflow test...\033[0m"
                ./start.sh 1
            else
                echo -e "\033[31mChat service is not running. Cannot run full workflow test.\033[0m"
                read -p "Press Enter to exit"
            fi
            ;;
        3)
            echo -e "\033[33mExiting...\033[0m"
            ;;
        *)
            echo -e "\033[31mInvalid choice. Exiting...\033[0m"
            ;;
    esac
else
    echo -e "\n\033[31mSome required services are not running. Please check the errors above.\033[0m"
    read -p "Press Enter to exit"
fi