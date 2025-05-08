# test_chat_service.ps1
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Chat Service Test Script" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Check if Python is installed
try {
    $pythonVersion = python --version
    Write-Host "Found Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Python is not installed or not in PATH. Please install Python 3.8 or newer." -ForegroundColor Red
    Write-Host "Press any key to continue..."
    $null = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Check if venv exists, if not create it
if (-not (Test-Path "venv")) {
    Write-Host "Virtual environment not found. Creating new virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    if (-not $?) {
        Write-Host "Failed to create virtual environment. Please check your Python installation." -ForegroundColor Red
        Write-Host "Press any key to continue..."
        $null = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
    Write-Host "Virtual environment created successfully." -ForegroundColor Green
}

# Activate venv
Write-Host "Activating virtual environment..." -ForegroundColor Cyan
& "venv\Scripts\Activate.ps1"

# Check if requirements are installed
$requirementsFile = "requirements.txt"
$requirementsInstalled = $false

try {
    # Try importing one of the key packages to check if requirements are installed
    $output = python -c "import requests, colorama, aiohttp, sseclient" 2>&1
    $requirementsInstalled = $?
} catch {
    $requirementsInstalled = $false
}

# Install requirements if needed
if (-not $requirementsInstalled) {
    Write-Host "Installing required packages..." -ForegroundColor Yellow
    
    # Check if requirements.txt exists
    if (-not (Test-Path $requirementsFile)) {
        Write-Host "ERROR: $requirementsFile not found!" -ForegroundColor Red
        Write-Host "Press any key to continue..."
        $null = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
    
    python -m pip install --upgrade pip
    python -m pip install -r $requirementsFile
    
    if (-not $?) {
        Write-Host "Failed to install required packages. See error messages above." -ForegroundColor Red
        Write-Host "Press any key to continue..."
        $null = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
    Write-Host "Required packages installed successfully." -ForegroundColor Green
} else {
    Write-Host "Required packages already installed." -ForegroundColor Green
}

# Run the test script
Write-Host "Running tests..." -ForegroundColor Cyan
python test_chat_service.py

# Check test result
if ($LASTEXITCODE -eq 0) {
    Write-Host "===================================" -ForegroundColor Green
    Write-Host "Tests completed successfully!" -ForegroundColor Green
    Write-Host "===================================" -ForegroundColor Green
} else {
    Write-Host "===================================" -ForegroundColor Red
    Write-Host "Tests failed with exit code $LASTEXITCODE" -ForegroundColor Red
    Write-Host "===================================" -ForegroundColor Red
}

Write-Host "Press any key to continue..."
$null = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")