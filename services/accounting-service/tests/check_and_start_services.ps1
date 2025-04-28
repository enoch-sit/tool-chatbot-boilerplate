# This script checks if the required services are running and starts them if needed

Write-Host "Checking if required services are running..." -ForegroundColor Cyan

# Configuration
$AUTH_SERVICE_URL = "http://localhost:3000"
$ACCOUNTING_SERVICE_URL = "http://localhost:3001"
$CHAT_SERVICE_URL = "http://localhost:3002"

# Function to check if a service is running
function Check-ServiceHealth {
    param (
        [string]$ServiceName,
        [string]$ServiceUrl
    )
    
    Write-Host "Checking $ServiceName service at $ServiceUrl..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "$ServiceUrl/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "$ServiceName is running ✅" -ForegroundColor Green
            return $true
        } else {
            Write-Host "$ServiceName is not healthy (Status: $($response.StatusCode)) ❌" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "$ServiceName is not running ❌" -ForegroundColor Red
        return $false
    }
}

# Check if services are running
$auth_running = Check-ServiceHealth -ServiceName "Authentication" -ServiceUrl $AUTH_SERVICE_URL
$accounting_running = Check-ServiceHealth -ServiceName "Accounting" -ServiceUrl $ACCOUNTING_SERVICE_URL
$chat_running = Check-ServiceHealth -ServiceName "Chat" -ServiceUrl $CHAT_SERVICE_URL

# Get the path to the service directories
$current_dir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$root_dir = Split-Path -Parent (Split-Path -Parent $current_dir)
$auth_dir = Join-Path -Path $root_dir -ChildPath "authentication-service"
$accounting_dir = Join-Path -Path $root_dir -ChildPath "accounting-service"
$chat_dir = Join-Path -Path $root_dir -ChildPath "chat-service"

# Function to start a service using docker-compose
function Start-DockerService {
    param (
        [string]$ServiceName,
        [string]$ServiceDir,
        [switch]$Wait
    )
    
    Write-Host "`nStarting $ServiceName service..." -ForegroundColor Cyan
    
    $docker_compose_file = Join-Path -Path $ServiceDir -ChildPath "docker-compose.yml"
    
    if (Test-Path -Path $docker_compose_file) {
        # Change to the service directory
        Push-Location -Path $ServiceDir
        
        try {
            # Start the service using Docker Compose
            Write-Host "Running docker-compose up in $ServiceDir" -ForegroundColor Yellow
            if ($Wait) {
                docker-compose up -d
                Write-Host "Waiting for $ServiceName to start..." -ForegroundColor Yellow
                Start-Sleep -Seconds 10
            } else {
                Start-Process -FilePath "docker-compose" -ArgumentList "up", "-d" -NoNewWindow
            }
            
            Write-Host "$ServiceName service started successfully" -ForegroundColor Green
        }
        catch {
            Write-Host "Error starting $ServiceName service: $_" -ForegroundColor Red
        }
        finally {
            # Return to the original directory
            Pop-Location
        }
    } else {
        Write-Host "docker-compose.yml not found in $ServiceDir" -ForegroundColor Red
    }
}

# Check if Docker is running
try {
    $docker_running = docker info | Out-Null
    $docker_running = $?  # Get the success/failure of the previous command
}
catch {
    $docker_running = $false
}

if (-not $docker_running) {
    Write-Host "`nDocker is not running. Please start Docker Desktop before continuing." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

# Start services if they're not running
$services_started = $false

# Always start Authentication first as it's required by other services
if (-not $auth_running) {
    Start-DockerService -ServiceName "Authentication" -ServiceDir $auth_dir -Wait
    $services_started = $true
    $auth_running = Check-ServiceHealth -ServiceName "Authentication" -ServiceUrl $AUTH_SERVICE_URL
}

# For Auth-Accounting tests, we need only these two services
if (-not $accounting_running) {
    Start-DockerService -ServiceName "Accounting" -ServiceDir $accounting_dir -Wait
    $services_started = $true
    $accounting_running = Check-ServiceHealth -ServiceName "Accounting" -ServiceUrl $ACCOUNTING_SERVICE_URL
}

# For full workflow tests, we need Chat service too
if (-not $chat_running) {
    Start-DockerService -ServiceName "Chat" -ServiceDir $chat_dir
    $services_started = $true
}

# Final status check
Write-Host "`nServices status:" -ForegroundColor Cyan
if ($auth_running) { 
    Write-Host "Authentication: Running ✅" -ForegroundColor Green 
} else { 
    Write-Host "Authentication: Not running ❌" -ForegroundColor Red 
}

if ($accounting_running) { 
    Write-Host "Accounting: Running ✅" -ForegroundColor Green 
} else { 
    Write-Host "Accounting: Not running ❌" -ForegroundColor Red 
}

if ($chat_running) { 
    Write-Host "Chat: Running ✅" -ForegroundColor Green 
} else { 
    Write-Host "Chat: Not running (may not be needed for Auth-Accounting tests)" -ForegroundColor Yellow 
}

# Prompt user for action based on service status
if ($auth_running -and $accounting_running) {
    Write-Host "`nReady to run Auth-Accounting workflow tests." -ForegroundColor Green
    
    if ($chat_running) {
        Write-Host "All services are running. Ready to run full workflow tests." -ForegroundColor Green
    } else {
        Write-Host "Chat service is not running. You can only run Auth-Accounting tests." -ForegroundColor Yellow
    }
    
    Write-Host "`nWhat would you like to do?" -ForegroundColor Cyan
    Write-Host "1. Run Auth-Accounting workflow test" -ForegroundColor White
    Write-Host "2. Run full workflow test (requires Chat service)" -ForegroundColor White
    Write-Host "3. Exit" -ForegroundColor White
    
    $choice = Read-Host "`nEnter your choice (1-3)"
    
    switch ($choice) {
        "1" {
            Write-Host "`nRunning Auth-Accounting workflow test..." -ForegroundColor Cyan
            & .\start.ps1 2
        }
        "2" {
            if ($chat_running) {
                Write-Host "`nRunning full workflow test..." -ForegroundColor Cyan
                & .\start.ps1 1
            } else {
                Write-Host "Chat service is not running. Cannot run full workflow test." -ForegroundColor Red
                Read-Host "Press Enter to exit"
            }
        }
        "3" {
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