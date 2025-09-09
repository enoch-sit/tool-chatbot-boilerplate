# Server Deployment Guide

This guide is for deploying the Azure OpenAI Mock Server on Ubuntu with nginx proxy.

## Quick Setup

### 1. First time setup on Ubuntu server:

```bash
# Navigate to project directory
cd ~/service004chatbot/tool-chatbot-boilerplate/services/mimicAzure

# Make script executable
chmod +x server-docker.sh

# Edit environment file for server (disable HTTPS since nginx handles it)
nano .env
# Change: ENABLE_HTTPS=false

# Start the server
./server-docker.sh start
```

### 2. Test the deployment:

```bash
# Check server status
./server-docker.sh status

# Test health endpoint
curl http://localhost:5555/health
```

## Available Commands

```bash
./server-docker.sh start    # Start the server
./server-docker.sh stop     # Stop the server  
./server-docker.sh restart  # Restart the server
./server-docker.sh logs     # View server logs
./server-docker.sh status   # Check status and health
./server-docker.sh build    # Rebuild Docker image
```

## Architecture

- **Container**: HTTP-only on port 5555
- **Nginx**: Handles HTTPS termination and proxies to container
- **Environment**: Production mode with EdUHK API proxy

## Troubleshooting

### Container won't start:
```bash
./server-docker.sh logs
```

### Health check fails:
```bash
curl -v http://localhost:5555/health
```

### Rebuild after code changes:
```bash
git pull
./server-docker.sh restart
```
