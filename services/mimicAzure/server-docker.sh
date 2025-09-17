#!/bin/bash

# Azure OpenAI Mock Server - Server Management Script
# Usage: ./server-docker.sh [start|stop|restart|logs|status]
#
# First time setup on Ubuntu server:
# 1. chmod +x server-docker.sh
# 2. Edit .env file: set ENABLE_HTTPS=false
# 3. ./server-docker.sh start

COMPOSE_FILE="docker-compose-server.yml"
SERVICE_NAME="azure-openai-mock"

case "$1" in
    start)
        echo "Starting Azure OpenAI Mock Server..."
        sudo docker compose -f $COMPOSE_FILE up -d --build
        echo "Server started. Use './server-docker.sh status' to check status."
        ;;
    stop)
        echo "Stopping Azure OpenAI Mock Server..."
        sudo docker compose -f $COMPOSE_FILE down
        echo "Server stopped."
        ;;
    restart)
        echo "Restarting Azure OpenAI Mock Server..."
        sudo docker compose -f $COMPOSE_FILE down
        sudo docker compose -f $COMPOSE_FILE up -d --build
        echo "Server restarted."
        ;;
    logs)
        echo "Showing logs for Azure OpenAI Mock Server..."
        sudo docker compose -f $COMPOSE_FILE logs -f $SERVICE_NAME
        ;;
    status)
        echo "Checking server status..."
        sudo docker compose -f $COMPOSE_FILE ps
        echo ""
        echo "Testing health endpoint..."
        curl -s http://localhost:5555/health && echo "" || echo "Service not responding"
        ;;
    build)
        echo "Building Azure OpenAI Mock Server..."
        sudo docker compose -f $COMPOSE_FILE build --no-cache
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs|status|build}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the server"
        echo "  stop    - Stop the server"
        echo "  restart - Restart the server"
        echo "  logs    - Show server logs"
        echo "  status  - Check server status and health"
        echo "  build   - Rebuild the Docker image"
        exit 1
        ;;
esac
