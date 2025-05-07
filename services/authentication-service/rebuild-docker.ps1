# rebuild-docker.ps1
# Script to rebuild the authentication service Docker containers

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Authentication Service Docker Rebuild Script" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Function to check if a service is running by checking its health endpoint
function Check-ServiceHealth {
    param (
        [string]$serviceName,
        [string]$serviceUrl
    )
    
    Write-Host "Checking $serviceName service at $serviceUrl..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri "$serviceUrl/health" -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "$serviceName is running ✓" -ForegroundColor Green
            return $true
        } else {
            Write-Host "$serviceName is not running ✗" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "$serviceName is not running ✗" -ForegroundColor Red
        return $false
    }
}

# Define service URLs
$AUTH_SERVICE_URL = "http://localhost:3000"

# Get the directory of the current script
$scriptDir = $PSScriptRoot
$serviceDir = $scriptDir

# Navigate to the service directory
Set-Location $serviceDir
Write-Host "Working directory: $serviceDir" -ForegroundColor Yellow

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "Docker is running properly." -ForegroundColor Green
} catch {
    Write-Host "Docker is not running. Please start Docker before continuing." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if services are running before rebuild
Write-Host "`nChecking services status before rebuild:" -ForegroundColor Cyan
$authRunning = Check-ServiceHealth -serviceName "Authentication" -serviceUrl $AUTH_SERVICE_URL

# Stop existing containers
Write-Host "`nStopping existing authentication service containers..." -ForegroundColor Yellow
docker-compose down

# Ask about removing volumes
$removeVolumes = Read-Host "Do you want to remove database volumes? This will delete all data (y/n)"
if ($removeVolumes -eq 'y') {
    Write-Host "Removing Docker volumes..." -ForegroundColor Cyan
    docker volume rm $(docker volume ls -q --filter name=authentication-service) 2>$null
}

# Rebuild and start the containers
Write-Host "`nRebuilding and starting authentication service containers..." -ForegroundColor Yellow
docker-compose up -d --build

# Wait for services to start
Write-Host "`nWaiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check if services are running after rebuild
Write-Host "`nChecking services status after rebuild:" -ForegroundColor Cyan
$authRunning = Check-ServiceHealth -serviceName "Authentication" -serviceUrl $AUTH_SERVICE_URL

# Final status report
Write-Host "`nFinal services status:" -ForegroundColor Cyan
if ($authRunning) {
    Write-Host "Authentication: Running ✓" -ForegroundColor Green
    Write-Host "`nAuthentication service was rebuilt and started successfully at http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "Authentication: Not running ✗" -ForegroundColor Red
    Write-Host "`nFailed to rebuild Authentication service. Please check the logs for errors." -ForegroundColor Red
}

Write-Host "`nTo view logs, run: docker-compose logs -f" -ForegroundColor Cyan