# test_chat_service.ps1
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Running Chat Service Test Script" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Check if venv exists
if (-not (Test-Path "venv")) {
    Write-Host "Virtual environment not found." -ForegroundColor Red
    Write-Host "Please run install.bat first." -ForegroundColor Red
    Write-Host "Press any key to continue..."
    $null = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Activate venv and run test script
Write-Host "Activating virtual environment..." -ForegroundColor Cyan
& "venv\Scripts\Activate.ps1"

Write-Host "Running tests..." -ForegroundColor Cyan
python test_chat_service.py

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Test execution completed" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

Write-Host "Press any key to continue..."
$null = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")