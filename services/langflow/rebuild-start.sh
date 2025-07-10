#!/bin/bash

echo "Checking for Docker..."
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed or not running. Please install Docker and ensure it is running."
    exit 1
fi

echo "Checking for Docker Compose..."
if ! command -v docker compose &> /dev/null; then
    echo "ERROR: Docker Compose is not installed. Please install Docker Compose."
    exit 1
fi

echo "Ensuring external networks exist..."
if ! docker network inspect boilerplate-accounting-nodejs-typescript_auth-network &> /dev/null; then
    echo "Creating auth-network..."
    docker network create boilerplate-accounting-nodejs-typescript_auth-network
fi
if ! docker network inspect accounting-service_accounting-network &> /dev/null; then
    echo "Creating accounting-network..."
    docker network create accounting-service_accounting-network
fi

echo "Rebuilding Langflow image..."
docker build -t myuser/langflow-custom:1.0.0 .

echo "Starting Docker Compose services..."
docker compose down
docker compose up -d --build

echo "Langflow is starting. Access it at http://localhost:7860/"
echo "To stop services, run: docker compose down"