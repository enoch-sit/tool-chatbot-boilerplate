# This script creates a virtual environment and installs required packages for workflow testing

Write-Host "Creating virtual environment in tests folder..." -ForegroundColor Cyan

# Get the directory where the script is located
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

# Create virtual environment if it doesn't exist
if (-not (Test-Path "venv")) {
    Write-Host "Creating new Python virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    Write-Host "Virtual environment created." -ForegroundColor Green
} else {
    Write-Host "Virtual environment already exists." -ForegroundColor Yellow
}

# Activate virtual environment and install packages
Write-Host "Activating virtual environment..." -ForegroundColor Cyan
& .\venv\Scripts\Activate.ps1

Write-Host "Installing required packages..." -ForegroundColor Cyan
pip install requests aiohttp colorama tqdm

Write-Host "Setup complete! Use start.ps1 to run the tests." -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to exit"