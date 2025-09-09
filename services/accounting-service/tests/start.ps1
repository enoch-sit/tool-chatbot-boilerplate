# This script activates the virtual environment and runs the workflow tests

Write-Host "Activating virtual environment..." -ForegroundColor Cyan

# Get the directory where the script is located
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

# Activate the virtual environment
& .\venv\Scripts\Activate.ps1

# Check if a scenario parameter was passed
$scenarioParam = $args[0]

if ($scenarioParam) {
    # If parameter was passed from check_and_start_services.ps1
    switch ($scenarioParam) {
        1 {
            Write-Host ""
            Write-Host "Running full workflow test..." -ForegroundColor Cyan
            python workflow_test.py --all
        }
        2 {
            Write-Host ""
            Write-Host "Running Auth-Accounting workflow test..." -ForegroundColor Cyan
            python workflow_test_Auth_Acc.py
        }
        default {
            Write-Host "Invalid parameter: $scenarioParam" -ForegroundColor Red
            exit 1
        }
    }
} else {
    # Original interactive menu
    Write-Host ""
    Write-Host "=== Available Test Scripts ===" -ForegroundColor Green
    Write-Host "1. Run full workflow test (all services)" -ForegroundColor White
    Write-Host "2. Run Auth-Accounting workflow test only" -ForegroundColor White
    Write-Host "3. Exit" -ForegroundColor White
    Write-Host ""

    $choice = Read-Host "Enter your choice (1-3)"

    switch ($choice) {
        "1" {
            Write-Host ""
            Write-Host "Running full workflow test..." -ForegroundColor Cyan
            python workflow_test.py --all
        }
        "2" {
            Write-Host ""
            Write-Host "Running Auth-Accounting workflow test..." -ForegroundColor Cyan
            python workflow_test_Auth_Acc.py
        }
        "3" {
            Write-Host "Exiting..." -ForegroundColor Yellow
            exit 0
        }
        default {
            Write-Host "Invalid choice. Please run the script again." -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host ""
Write-Host "Test complete." -ForegroundColor Green
Read-Host "Press Enter to exit"