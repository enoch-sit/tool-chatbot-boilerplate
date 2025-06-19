@echo off
echo Stopping and removing test containers...
docker-compose -f docker-compose.test.yml down -v

echo Removing dangling volumes (if any)...
for /f "tokens=*" %%i in ('docker volume ls -qf dangling=true') do docker volume rm %%i

echo Starting test containers...
docker-compose -f docker-compose.test.yml up -d

echo Done. Test environment has been reset.
