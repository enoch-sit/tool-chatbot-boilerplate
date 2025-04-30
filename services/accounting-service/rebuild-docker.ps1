# rebuild-docker.ps1
# Script to rebuild the accounting service Docker containers

Write-Host "Stopping and removing existing containers..." -ForegroundColor Cyan
docker-compose down

Write-Host "Removing Docker volumes..." -ForegroundColor Cyan
# Uncomment next line if you want to remove volumes (will delete database data)
docker volume rm $(docker volume ls -q --filter name=accounting-service_postgres-data)

Write-Host "Rebuilding images..." -ForegroundColor Cyan
docker-compose build --no-cache

Write-Host "Starting services..." -ForegroundColor Cyan
docker-compose up -d

Write-Host "Showing logs..." -ForegroundColor Cyan
docker-compose logs -f

# Press Ctrl+C to exit logs and return to PowerShell