#!/bin/bash
# This script creates a virtual environment and installs required packages for workflow testing

echo -e "\033[36mCreating virtual environment in tests folder...\033[0m"

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo -e "\033[33mCreating new Python virtual environment...\033[0m"
    python3 -m venv venv
    echo -e "\033[32mVirtual environment created.\033[0m"
else
    echo -e "\033[33mVirtual environment already exists.\033[0m"
fi

# Activate virtual environment and install packages
echo -e "\033[36mActivating virtual environment...\033[0m"
source venv/bin/activate

echo -e "\033[36mInstalling required packages...\033[0m"
pip install requests aiohttp colorama tqdm

echo -e "\033[32mSetup complete! Use start.sh to run the tests.\033[0m"
echo ""
read -p "Press Enter to exit"