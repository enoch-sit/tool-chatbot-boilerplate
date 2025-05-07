# simple-start-docker.ps1
# A simplified script to start the authentication service Docker containers

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Authentication Service Simple Docker Start Script" -ForegroundColor Cyan
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

# Get service directory
$scriptDir = $PSScriptRoot
$authServiceDir = $scriptDir

# Start Authentication Service
Write-Host "`nStarting Authentication Service..." -ForegroundColor Yellow
Set-Location $authServiceDir
docker-compose up -d

Write-Host "`nAuthentication service has been started!" -ForegroundColor Green
Write-Host "Authentication service should be available at http://localhost:3000" -ForegroundColor Cyan
Write-Host "To view logs, use: docker-compose logs -f" -ForegroundColor Cyan

# Return to script directory
Set-Location $scriptDir