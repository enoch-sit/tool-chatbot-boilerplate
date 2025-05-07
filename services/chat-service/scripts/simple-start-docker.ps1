# simple-start-docker.ps1
# A simplified script to start the chat service Docker containers

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Chat Service Simple Docker Start Script" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Check if Docker is running
Write-Host "`nChecking if Docker is running..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "Docker is running properly." -ForegroundColor Green
} catch {
    Write-Host "Docker is not running. Please start Docker Desktop before continuing." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Get service directories
$scriptDir = $PSScriptRoot
$chatServiceDir = Split-Path -Parent $scriptDir
$rootDir = Split-Path -Parent (Split-Path -Parent $chatServiceDir)
$authServiceDir = Join-Path -Path $rootDir -ChildPath "authentication-service"
$accountingServiceDir = Join-Path -Path $rootDir -ChildPath "accounting-service"

# Start Chat Service and dependencies
Write-Host "`nStarting services in order: Authentication -> Accounting -> Chat..." -ForegroundColor Cyan

# Start Authentication Service (if it exists)
if (Test-Path -Path (Join-Path -Path $authServiceDir -ChildPath "docker-compose.yml")) {
    Write-Host "`nStarting Authentication Service..." -ForegroundColor Yellow
    Set-Location $authServiceDir
    docker-compose up -d
    Write-Host "Authentication Service started. Waiting for initialization..." -ForegroundColor Green
    Start-Sleep -Seconds 10
}

# Start Accounting Service (if it exists)
if (Test-Path -Path (Join-Path -Path $accountingServiceDir -ChildPath "docker-compose.yml")) {
    Write-Host "`nStarting Accounting Service..." -ForegroundColor Yellow
    Set-Location $accountingServiceDir
    docker-compose up -d
    Write-Host "Accounting Service started. Waiting for initialization..." -ForegroundColor Green
    Start-Sleep -Seconds 10
}

# Start Chat Service
Write-Host "`nStarting Chat Service..." -ForegroundColor Yellow
Set-Location $chatServiceDir
docker-compose up -d

Write-Host "`nAll services have been started!" -ForegroundColor Green
Write-Host "Chat service should be available at http://localhost:3002" -ForegroundColor Cyan
Write-Host "To view logs, use: docker-compose logs -f" -ForegroundColor Cyan

# Return to scripts directory
Set-Location $scriptDir