#!/bin/bash
# rebuild-docker.sh
# Script to rebuild the accounting service Docker containers

echo -e "\033[0;36mStopping and removing existing containers...\033[0m"
docker-compose down

echo -e "\033[0;36mRemoving Docker volumes...\033[0m"
# Uncomment next line if you want to remove volumes (will delete database data)
# docker volume rm $(docker volume ls -q --filter name=accounting-service_postgres-data)

echo -e "\033[0;36mRebuilding images...\033[0m"
docker-compose build --no-cache

echo -e "\033[0;36mStarting services...\033[0m"
docker-compose up -d

echo -e "\033[0;36mShowing logs...\033[0m"
docker-compose logs -f

# Press Ctrl+C to exit logs and return to the shell