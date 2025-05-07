# rebuild-docker.ps1
# Script to rebuild the accounting service Docker containers

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Accounting Service Docker Rebuild Script" -ForegroundColor Cyan
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
$ACCOUNTING_SERVICE_URL = "http://localhost:3001"

# Get the directory of the current script
$serviceDir = $PSScriptRoot
$rootDir = (Get-Item $serviceDir).Parent.Parent.FullName
$authDir = Join-Path -Path $rootDir -ChildPath "authentication-service"

# Navigate to the service directory
Set-Location $serviceDir
Write-Host "Working directory: $serviceDir" -ForegroundColor Yellow

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "Docker is running properly." -ForegroundColor Green
} catch {
    Write-Host "Docker is not running. Please start Docker Desktop before continuing." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if services are running before rebuild
Write-Host "`nChecking services status before rebuild:" -ForegroundColor Cyan
$authRunning = Check-ServiceHealth -serviceName "Authentication" -serviceUrl $AUTH_SERVICE_URL
$accountingRunning = Check-ServiceHealth -serviceName "Accounting" -serviceUrl $ACCOUNTING_SERVICE_URL

# Function to start a service if not running
function Start-DockerService {
    param (
        [string]$serviceName,
        [string]$serviceDir,
        [bool]$waitForStartup
    )
    
    Write-Host "`nStarting $serviceName service..." -ForegroundColor Cyan
    
    if (Test-Path -Path (Join-Path -Path $serviceDir -ChildPath "docker-compose.yml")) {
        # Change to the service directory
        Push-Location $serviceDir
        
        # Start the service using Docker Compose
        Write-Host "Running docker-compose up in $serviceDir" -ForegroundColor Yellow
        
        if ($waitForStartup) {
            docker-compose up -d
            Write-Host "Waiting for $serviceName to start..." -ForegroundColor Yellow
            Start-Sleep -Seconds 10
        } else {
            Start-Process -FilePath "docker-compose" -ArgumentList "up", "-d" -NoNewWindow
        }
        
        Write-Host "$serviceName service started successfully" -ForegroundColor Green
        
        # Return to the original directory
        Pop-Location
    } else {
        Write-Host "docker-compose.yml not found in $serviceDir" -ForegroundColor Red
    }
}

# Make sure dependencies are running (Auth)
$dependenciesStarted = $false

# Start Authentication if not running (needed for shared network)
if (-not $authRunning) {
    Write-Host "`nAuthentication service is not running but is required." -ForegroundColor Yellow
    $startAuth = Read-Host "Do you want to start Authentication service? (y/n)"
    
    if ($startAuth -eq 'y') {
        Start-DockerService -serviceName "Authentication" -serviceDir $authDir -waitForStartup $true
        $dependenciesStarted = $true
        $authRunning = Check-ServiceHealth -serviceName "Authentication" -serviceUrl $AUTH_SERVICE_URL
    }
}

# Return to accounting service directory if we started dependencies
if ($dependenciesStarted) {
    Set-Location $serviceDir
}

# Stop existing containers
Write-Host "`nStopping existing accounting service containers..." -ForegroundColor Yellow
docker-compose down

# Ask about removing volumes
$removeVolumes = Read-Host "Do you want to remove database volumes? This will delete all data (y/n)"
if ($removeVolumes -eq 'y') {
    Write-Host "Removing Docker volumes..." -ForegroundColor Cyan
    docker volume rm $(docker volume ls -q --filter name=accounting-service_postgres-data) 2>$null
}

# Rebuild and start the containers
Write-Host "`nRebuilding and starting accounting service containers..." -ForegroundColor Yellow
docker-compose up -d --build

# Wait for services to start
Write-Host "`nWaiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check if services are running after rebuild
Write-Host "`nChecking services status after rebuild:" -ForegroundColor Cyan
$authRunning = Check-ServiceHealth -serviceName "Authentication" -serviceUrl $AUTH_SERVICE_URL
$accountingRunning = Check-ServiceHealth -serviceName "Accounting" -serviceUrl $ACCOUNTING_SERVICE_URL

# Final status report
Write-Host "`nFinal services status:" -ForegroundColor Cyan
if ($authRunning) {
    Write-Host "Authentication: Running ✓" -ForegroundColor Green
} else {
    Write-Host "Authentication: Not running ✗" -ForegroundColor Red
}

if ($accountingRunning) {
    Write-Host "Accounting: Running ✓" -ForegroundColor Green
    Write-Host "`nAccounting service was rebuilt and started successfully at http://localhost:3001" -ForegroundColor Green
} else {
    Write-Host "Accounting: Not running ✗" -ForegroundColor Red
    Write-Host "`nFailed to rebuild Accounting service. Please check the logs for errors." -ForegroundColor Red
}

Write-Host "`nTo view logs, run: docker-compose logs -f" -ForegroundColor Cyan