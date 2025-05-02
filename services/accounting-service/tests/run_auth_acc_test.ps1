# Auth-Accounting Workflow Test Runner PowerShell Script
# This script checks if the necessary services are running and runs the Auth-Accounting workflow test

Write-Host "Auth-Accounting Workflow Test Runner" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Checking if required services are running..." -ForegroundColor Cyan

# Configuration
$AUTH_SERVICE_URL = "http://localhost:3000"
$ACCOUNTING_SERVICE_URL = "http://localhost:3001"

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
        } 
        else {
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

# Get the path to the service directories
$current_dir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$root_dir = Split-Path -Parent (Split-Path -Parent $current_dir)
$auth_dir = Join-Path -Path $root_dir -ChildPath "authentication-service"
$accounting_dir = Join-Path -Path $root_dir -ChildPath "accounting-service"

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
            } 
            else {
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
    } 
    else {
        Write-Host "docker-compose.yml not found in $ServiceDir" -ForegroundColor Red
    }
}

# Check if Docker is running
try {
    docker info | Out-Null
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

# Start Authentication if not running
if (-not $auth_running) {
    Start-DockerService -ServiceName "Authentication" -ServiceDir $auth_dir -Wait
    $services_started = $true
    $auth_running = Check-ServiceHealth -ServiceName "Authentication" -ServiceUrl $AUTH_SERVICE_URL
}

# Start Accounting if not running 
if (-not $accounting_running) {
    Start-DockerService -ServiceName "Accounting" -ServiceDir $accounting_dir -Wait
    $services_started = $true
    $accounting_running = Check-ServiceHealth -ServiceName "Accounting" -ServiceUrl $ACCOUNTING_SERVICE_URL
}

# Final status check
Write-Host "`nServices status:" -ForegroundColor Cyan
if ($auth_running) { 
    Write-Host "Authentication: Running ✅" -ForegroundColor Green 
} 
else { 
    Write-Host "Authentication: Not running ❌" -ForegroundColor Red 
}

if ($accounting_running) { 
    Write-Host "Accounting: Running ✅" -ForegroundColor Green 
} 
else { 
    Write-Host "Accounting: Not running ❌" -ForegroundColor Red 
}

# Check if we can run the test
if (-not ($auth_running -and $accounting_running)) {
    Write-Host "`nCannot run Auth-Accounting workflow test because one or more required services are not running." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Activate the virtual environment and run the test
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

Write-Host "`nActivating virtual environment..." -ForegroundColor Cyan

# Activate the virtual environment
try {
    & .\venv\Scripts\Activate.ps1
    
    Write-Host "`nRunning Auth-Accounting workflow test..." -ForegroundColor Cyan
    python workflow_test_Auth_Acc.py
    
    Write-Host "`nTest complete." -ForegroundColor Green
}
catch {
    Write-Host "`nError running test: $_" -ForegroundColor Red
}

Read-Host "Press Enter to exit"