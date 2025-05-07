# simple-start-docker.ps1
# A simplified script to start the accounting service Docker containers

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Accounting Service Simple Docker Start Script" -ForegroundColor Cyan
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
$accountingServiceDir = $scriptDir
$rootDir = (Get-Item $accountingServiceDir).Parent.Parent.FullName
$authServiceDir = Join-Path -Path $rootDir -ChildPath "authentication-service"

# Start services in order
Write-Host "`nStarting services in order: Authentication -> Accounting..." -ForegroundColor Cyan

# Start Authentication Service (if it exists)
if (Test-Path -Path (Join-Path -Path $authServiceDir -ChildPath "docker-compose.yml")) {
    Write-Host "`nStarting Authentication Service..." -ForegroundColor Yellow
    Set-Location $authServiceDir
    docker-compose up -d
    Write-Host "Authentication Service started. Waiting for initialization..." -ForegroundColor Green
    Start-Sleep -Seconds 10
}

# Start Accounting Service
Write-Host "`nStarting Accounting Service..." -ForegroundColor Yellow
Set-Location $accountingServiceDir
docker-compose up -d

Write-Host "`nAll services have been started!" -ForegroundColor Green
Write-Host "Accounting service should be available at http://localhost:3001" -ForegroundColor Cyan
Write-Host "To view logs, use: docker-compose logs -f" -ForegroundColor Cyan

# Return to scripts directory
Set-Location $scriptDir