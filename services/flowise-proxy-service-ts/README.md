# Flowise Proxy Service

A Node.js server for testing and proxying Flowise API endpoints.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```env
FLOWISE_ENDPOINT=http://localhost:3000
FLOWISE_API_KEY=your_jwt_token_here
PORT=3001
```

3. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Available Endpoints

### Server Endpoints

- `GET /` - Root endpoint with available endpoints information
- `GET /health` - Health check endpoint

### Test Endpoints

- `GET /test/chatflows` - Test listing all chatflows
- `GET /test/chatflows/:id` - Test getting a specific chatflow
- `POST /test/prediction/:id` - Test making a prediction

### Proxy Endpoints

- `* /api/*` - Proxy any request to Flowise API

## Testing

Run the automated test suite:
```bash
npm test
```

Or manually test individual endpoints:
```bash
# Health check
curl http://localhost:3001/health

# List chatflows
curl http://localhost:3001/test/chatflows

# Get specific chatflow
curl http://localhost:3001/test/chatflows/your-chatflow-id

# Make prediction
curl -X POST http://localhost:3001/test/prediction/your-chatflow-id \
  -H "Content-Type: application/json" \
  -d '{"question": "Hello!"}'
```

## Configuration

The server requires the following environment variables:

- `FLOWISE_ENDPOINT` - The base URL of your Flowise instance
- `FLOWISE_API_KEY` - Your Flowise JWT token
- `PORT` - Port to run the server on (default: 3001)

## Error Handling

The server includes comprehensive error handling for:
- Network connectivity issues
- Authentication failures
- Invalid requests
- Server errors

All errors are returned in a consistent JSON format with appropriate HTTP status codes.

## Features

- ✅ Environment variable configuration
- ✅ Bearer token authentication
- ✅ Request/response logging
- ✅ Error handling and status codes
- ✅ CORS support
- ✅ Automated testing
- ✅ Proxy functionality
- ✅ Health checks
