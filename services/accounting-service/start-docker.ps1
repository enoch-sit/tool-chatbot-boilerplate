# start-docker.ps1
# Script to start the accounting service Docker containers

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
$CHAT_SERVICE_URL = "http://localhost:3002"

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
$accountingRunning = Check-ServiceHealth -serviceName "Accounting" -serviceUrl $ACCOUNTING_SERVICE_URL

# Get the path to the service directories
$currentDir = $PSScriptRoot
$rootDir = (Get-Item $currentDir).Parent.Parent.FullName
$authDir = Join-Path -Path $rootDir -ChildPath "authentication-service"
$accountingDir = Join-Path -Path $rootDir -ChildPath "accounting-service"

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

# Start services if they're not running
$servicesStarted = $false

# Start Authentication if not running
if (-not $authRunning) {
    Start-DockerService -serviceName "Authentication" -serviceDir $authDir -waitForStartup $true
    $servicesStarted = $true
    
    # Check again if service is running
    $authRunning = Check-ServiceHealth -serviceName "Authentication" -serviceUrl $AUTH_SERVICE_URL
}

# Start Accounting if not running
if (-not $accountingRunning) {
    Start-DockerService -serviceName "Accounting" -serviceDir $accountingDir -waitForStartup $true
    $servicesStarted = $true
    
    # Check again if service is running
    $accountingRunning = Check-ServiceHealth -serviceName "Accounting" -serviceUrl $ACCOUNTING_SERVICE_URL
}

# Final status check
Write-Host "`nServices status:" -ForegroundColor Cyan
if ($authRunning) {
    Write-Host "Authentication: Running ✓" -ForegroundColor Green
} else {
    Write-Host "Authentication: Not running ✗" -ForegroundColor Red
}

if ($accountingRunning) {
    Write-Host "Accounting: Running ✓" -ForegroundColor Green
} else {
    Write-Host "Accounting: Not running ✗" -ForegroundColor Red
}

# Prompt user for action based on service status
if ($authRunning -and $accountingRunning) {
    Write-Host "`nReady to run Auth-Accounting workflow tests." -ForegroundColor Green
    
    Write-Host "`nWhat would you like to do?" -ForegroundColor Cyan
    Write-Host "1. Run Auth-Accounting workflow test"
    Write-Host "2. Exit"
    
    $choice = Read-Host "`nEnter your choice (1-2)"
    
    switch ($choice) {
        1 {
            Write-Host "`nRunning Auth-Accounting workflow test..." -ForegroundColor Cyan
            & (Join-Path -Path $currentDir -ChildPath "workflow_test_Auth_Acc.ps1")
        }
        2 {
            Write-Host "Exiting..." -ForegroundColor Yellow
        }
        default {
            Write-Host "Invalid choice. Exiting..." -ForegroundColor Red
        }
    }
} else {
    Write-Host "`nSome required services are not running. Please check the errors above." -ForegroundColor Red
    Read-Host "Press Enter to exit"
}