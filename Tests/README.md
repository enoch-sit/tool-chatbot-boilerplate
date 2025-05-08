# Chat Service Testing Guide

This folder contains scripts to help you test the chat service and its dependencies.

## Available Scripts

### `check_and_start_services.bat`

This script checks if all the required services (Authentication, Accounting, and Chat) are running and healthy.
If any service is not running, it will attempt to start it using Docker Compose.

Usage:
```
.\check_and_start_services.bat
```

### `test_aws_bedrock.bat`

This script tests your AWS Bedrock credentials and model access, which is essential for the Chat Service.
It verifies your AWS credentials can access Bedrock and tests specific models:
- amazon.nova-micro-v1:0
- amazon.nova-lite-v1:0
- amazon.titan-text-express-v1
- meta.llama3-70b-instruct-v1:0

Usage:
```
.\test_aws_bedrock.bat
```

### `test_chat_service.bat`

This is the main test script for the chat service. It:
1. Ensures Docker is running
2. Calls `check_and_start_services.bat` to make sure all required services are healthy
3. Specifically checks the Accounting Service (which has been causing issues)
4. Runs the Python-based chat service tests

Usage:
```
.\test_chat_service.bat
```

## Troubleshooting

If you encounter issues with the Accounting Service not being healthy, try these steps:

1. Check the Accounting Service logs:
   ```
   cd ..\services\accounting-service
   docker-compose logs
   ```

2. Rebuild the Accounting Service:
   ```
   cd ..\services\accounting-service
   .\rebuild-docker.bat
   ```

3. Check for port conflicts on port 3001

4. Verify database connection settings in the service's .env file

## Docker Network Configuration

The services communicate through a Docker network. Here's the expected configuration:

- Authentication Service: `http://localhost:3000` (container name: `auth-service`)
- Accounting Service: `http://localhost:3001` (container name: `accounting-service`)
- Chat Service: `http://localhost:3002` (container name: `chat-service`)

In production, services connect directly using container names (e.g., `http://accounting-service:3001`).
In development, they use localhost with the mapped ports.

## Prerequisites

The test scripts require:
- Docker Desktop
- Python (for running the chat service tests)
- curl (included in Windows 10/11 by default)