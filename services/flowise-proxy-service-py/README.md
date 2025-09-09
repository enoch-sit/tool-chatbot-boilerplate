# Flowise Proxy Service

A FastAPI-based proxy service for Flowise that provides authentication, authorization, and credit management functionality.

## Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: User permissions for chatflow access
- **Credit Management**: Track and deduct credits for API usage
- **Flowise Integration**: Seamless proxy to Flowise API endpoints
- **Docker Support**: Containerized deployment with Docker Compose

## Architecture

The service follows a comprehensive workflow:

1. **Client Request Reception**
2. **Authentication Flow Management**
3. **Credit Checking and Deduction**
4. **Chat Operation Processing**
5. **Consolidated Response Return**

## Project Structure

```
flowise-proxy-service/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── jwt_handler.py
│   │   └── middleware.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   └── chatflow.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── accounting_service.py
│   │   └── flowise_service.py
│   └── api/
│       ├── __init__.py
│       ├── chatflows.py
│       └── chat.py
├── tests/
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── requirements.txt
├── .env.example
└── README.md
```

## Setup

### 1. Environment Setup

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration

Copy the example environment file and configure:

```bash
copy .env.example .env
```

Edit `.env` with your configuration:

```env
# JWT Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Flowise Configuration
FLOWISE_API_URL=http://localhost:3000
FLOWISE_API_KEY=your-flowise-api-key

# External Services
EXTERNAL_AUTH_URL=http://localhost:8001
ACCOUNTING_SERVICE_URL=http://localhost:8002

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/flowise_proxy

# Server Configuration
DEBUG=true
HOST=0.0.0.0
PORT=8000
```

### 3. Running the Service

#### Development Mode

```bash
python -m app.main
```

#### Production with Docker

```bash
cd docker
docker-compose up -d
```

## API Endpoints

### Authentication

- `POST /chat/authenticate` - Authenticate and get JWT token

### Chatflows

- `GET /chatflows/` - List available chatflows
- `GET /chatflows/{chatflow_id}` - Get specific chatflow details
- `GET /chatflows/{chatflow_id}/config` - Get chatflow configuration

### Chat

- `POST /chat/predict` - Send chat prediction request
- `GET /chat/credits` - Get user credit balance

### Health

- `GET /` - Service information
- `GET /health` - Health check
- `GET /info` - Detailed service information

## Usage Example

### 1. Authentication

```bash
curl -X POST "http://localhost:8000/chat/authenticate" \
  -H "Content-Type: application/json" \
  -d '{"username": "user", "password": "pass"}'
```

### 2. List Chatflows

```bash
curl -X GET "http://localhost:8000/chatflows/" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Chat Prediction

```bash
curl -X POST "http://localhost:8000/chat/predict" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chatflow_id": "your-chatflow-id",
    "question": "Hello, how are you?",
    "overrideConfig": {}
  }'
```

## Testing

Run the test suite:

```bash
pytest tests/
```

## Dependencies

The service depends on external services:

- **Flowise API**: The main AI chatflow service
- **Authentication Service**: External user authentication
- **Accounting Service**: Credit management and tracking
- **PostgreSQL Database**: For user and chatflow data

## Security Features

- JWT token-based authentication
- Role-based access control
- Credit-based usage limiting
- Request validation and sanitization
- CORS protection

## Monitoring

- Health check endpoint for service monitoring
- Request logging and error tracking
- Transaction audit logging

## Development

### Code Structure

- `app/main.py` - FastAPI application setup
- `app/config.py` - Configuration management
- `app/auth/` - Authentication and authorization
- `app/services/` - External service integrations
- `app/api/` - API endpoint definitions
- `app/models/` - Database models

### Adding New Features

1. Define models in `app/models/`
2. Create service layer in `app/services/`
3. Add API endpoints in `app/api/`
4. Update tests in `tests/`

## License

This project is part of the Tool Chatbot Boilerplate suite.
