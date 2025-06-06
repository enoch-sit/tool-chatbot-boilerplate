@echo OFF

echo Pruning Docker build cache...
docker builder prune -a -f

echo Rebuilding and starting accounting-service...
docker-compose -f services/accounting-service/docker-compose.yml up -d --build

echo Rebuilding and starting chat-service...
@REM docker-compose -f services/chat-service/docker-compose.yml up -d --build

echo All services have been rebuilt and started.
