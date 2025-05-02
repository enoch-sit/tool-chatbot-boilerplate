#!/bin/bash
# Auth-Accounting Workflow Test Runner Shell Script
# This script checks if the necessary services are running and runs the Auth-Accounting workflow test

echo -e "\033[36mAuth-Accounting Workflow Test Runner\033[0m"
echo -e "\033[36m=====================================\033[0m"
echo -e "\033[36mChecking if required services are running...\033[0m"

# Configuration
AUTH_SERVICE_URL="http://localhost:3000"
ACCOUNTING_SERVICE_URL="http://localhost:3001"

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

# Convert exit codes to boolean (0=true, 1=false)
auth_running=$((auth_running == 0))
accounting_running=$((accounting_running == 0))

# Get the path to the service directories
current_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
root_dir="$(dirname "$(dirname "$current_dir")")"
auth_dir="$root_dir/authentication-service"
accounting_dir="$root_dir/accounting-service"

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

# Start Authentication if not running
if [ $auth_running -eq 0 ]; then
    start_docker_service "Authentication" "$auth_dir" "true"
    services_started=true
    
    # Check again if service is running
    check_service_health "Authentication" "$AUTH_SERVICE_URL"
    auth_running=$((auth_running == 0))
fi

# Start Accounting if not running
if [ $accounting_running -eq 0 ]; then
    start_docker_service "Accounting" "$accounting_dir" "true"
    services_started=true
    
    # Check again if service is running
    check_service_health "Accounting" "$ACCOUNTING_SERVICE_URL"
    accounting_running=$((accounting_running == 0))
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

# Check if we can run the test
if [[ $auth_running -eq 0 || $accounting_running -eq 0 ]]; then
    echo -e "\n\033[31mCannot run Auth-Accounting workflow test because one or more required services are not running.\033[0m"
    read -p "Press Enter to exit"
    exit 1
fi

# Activate the virtual environment and run the test
cd "$current_dir"

echo -e "\n\033[36mActivating virtual environment...\033[0m"

# Activate the virtual environment
if [ -f "./venv/bin/activate" ]; then
    source ./venv/bin/activate
    
    echo -e "\n\033[36mRunning Auth-Accounting workflow test...\033[0m"
    python workflow_test_Auth_Acc.py
    
    echo -e "\n\033[32mTest complete.\033[0m"
else
    echo -e "\n\033[31mVirtual environment not found. Please create it first using install.sh\033[0m"
    read -p "Press Enter to exit"
    exit 1
fi

read -p "Press Enter to exit"