# start-docker.ps1
# Script to start the authentication service Docker containers

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

# Check if Docker is running
Write-Host "Checking if Docker is running..." -ForegroundColor Cyan
try {
    docker info | Out-Null
} catch {
    Write-Host "Docker is not running. Please start Docker before continuing." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if services are running
$authRunning = Check-ServiceHealth -serviceName "Authentication" -serviceUrl $AUTH_SERVICE_URL

# Print services status
Write-Host "`nServices status:" -ForegroundColor Cyan
if ($authRunning) {
    Write-Host "Authentication: Running ✓" -ForegroundColor Green
} else {
    Write-Host "Authentication: Not running ✗" -ForegroundColor Red
}

# Get the path to the service directory
$scriptDir = $PSScriptRoot
$serviceDir = $scriptDir

# Function to start a service using docker-compose
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

# Start Authentication if not running
if (-not $authRunning) {
    Start-DockerService -serviceName "Authentication" -serviceDir $serviceDir -waitForStartup $true
    
    # Check again if service is running
    $authRunning = Check-ServiceHealth -serviceName "Authentication" -serviceUrl $AUTH_SERVICE_URL
}

# Final status check
Write-Host "`nFinal services status:" -ForegroundColor Cyan
if ($authRunning) {
    Write-Host "Authentication: Running ✓" -ForegroundColor Green
} else {
    Write-Host "Authentication: Not running ✗" -ForegroundColor Red
}

# Summary message
if ($authRunning) {
    Write-Host "`nAuthentication service is running successfully at http://localhost:3000" -ForegroundColor Green
    Write-Host "To view logs, run: docker-compose logs -f" -ForegroundColor Cyan
} else {
    Write-Host "`nFailed to start Authentication service. Please check the errors above." -ForegroundColor Red
}