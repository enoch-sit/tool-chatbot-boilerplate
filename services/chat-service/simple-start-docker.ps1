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

# Get current directory
$scriptDir = $PSScriptRoot

# Start Chat Service
Write-Host "`nStarting Chat Service..." -ForegroundColor Yellow
Set-Location $scriptDir
docker-compose up -d

Write-Host "`nChat service has been started!" -ForegroundColor Green
Write-Host "Chat service should be available at http://localhost:3002" -ForegroundColor Cyan
Write-Host "Grafana dashboard available at http://localhost:3003" -ForegroundColor Cyan
Write-Host "To view logs, use: docker-compose logs -f" -ForegroundColor Cyan

# Return to scripts directory
Set-Location $scriptDir