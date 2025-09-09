#!/bin/bash
# This script activates the virtual environment and runs the workflow tests

echo -e "\033[36mActivating virtual environment...\033[0m"

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Activate the virtual environment
source venv/bin/activate

# Check if a scenario parameter was passed
scenarioParam=$1

if [ -n "$scenarioParam" ]; then
    # If parameter was passed from check_and_start_services.sh
    case $scenarioParam in
        1)
            echo ""
            echo -e "\033[36mRunning full workflow test...\033[0m"
            python workflow_test.py --all
            ;;
        2)
            echo ""
            echo -e "\033[36mRunning Auth-Accounting workflow test...\033[0m"
            python workflow_test_Auth_Acc.py
            ;;
        *)
            echo -e "\033[31mInvalid parameter: $scenarioParam\033[0m"
            exit 1
            ;;
    esac
else
    # Original interactive menu
    echo ""
    echo -e "\033[32m=== Available Test Scripts ===\033[0m"
    echo -e "1. Run full workflow test (all services)"
    echo -e "2. Run Auth-Accounting workflow test only"
    echo -e "3. Exit"
    echo ""

    read -p "Enter your choice (1-3): " choice

    case $choice in
        1)
            echo ""
            echo -e "\033[36mRunning full workflow test...\033[0m"
            python workflow_test.py --all
            ;;
        2)
            echo ""
            echo -e "\033[36mRunning Auth-Accounting workflow test...\033[0m"
            python workflow_test_Auth_Acc.py
            ;;
        3)
            echo -e "\033[33mExiting...\033[0m"
            exit 0
            ;;
        *)
            echo -e "\033[31mInvalid choice. Please run the script again.\033[0m"
            exit 1
            ;;
    esac
fi

echo ""
echo -e "\033[32mTest complete.\033[0m"
read -p "Press Enter to exit"