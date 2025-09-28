# Simple Path Tool API

A FastAPI-based REST API for pathfinding with turn instructions using a default city map.

## Features

- Find shortest paths between locations
- Turn-by-turn directions (left, right, around, straight)
- Default city map with buildings and street nodes
- RESTful API with JSON responses
- **Bearer token authentication** for protected endpoints
- Docker containerization support
- CORS enabled for web applications

## Authentication

This API uses Bearer token authentication for protected endpoints. You need to include an `Authorization` header with your requests:

```
Authorization: Bearer your-api-key-here
```

### Setting up API Key

1. **Local Development**: Set the `API_KEY` environment variable or modify the `.env` file
2. **Docker**: Update the `API_KEY` in `.env` file or pass as environment variable
3. **Default Key**: `your-secret-api-key-change-this` (change this for production!)

### Generate Secure API Key

```bash
python -c "import secrets; print('API_KEY=' + secrets.token_urlsafe(32))"
```

## Quick Start

### Local Development

1. Install dependencies:

```bash
pip install fastapi uvicorn
```

2. Run the server:

```bash
python main.py
```

3. Open your browser to: `http://localhost:8000/simpletool`

**Note**: All endpoints are now under the `/simpletool` base path.

### Docker

1. Build the image:

```bash
docker build -t simple-path-tool .
```

2. Run the container:

```bash
docker run -p 8000:8000 simple-path-tool
```

## API Endpoints

### Public Endpoints (No Authentication Required)

### GET /

- Root endpoint with API information

### GET /simpletool/health

- Health check endpoint

### GET /simpletool/locations

- Get all available locations (buildings and street nodes)

### GET /simpletool/buildings

- Get just the building names

### GET /simpletool/streets

- Get just the street node names

### GET /simpletool/path/example

- Get an example path for testing

### Protected Endpoints (Require Bearer Token)

### POST /simpletool/path

- Get path with turn instructions
- Request body: `{"start": "Police Station", "end": "Bakery"}`
- **Requires**: `Authorization: Bearer your-api-key`

### GET /simpletool/path/{start}/{end}

- Alternative GET endpoint for pathfinding
- Example: `GET /simpletool/path/Police%20Station/Bakery`
- **Requires**: `Authorization: Bearer your-api-key`

- Health check endpoint

## Response Format

### Path Response

```json
{
  "success": true,
  "path": ["Police Station", "4th_St_Main_St", "Main_St_2nd_St", "Bakery"],
  "edges": [
    {"from": "Police Station", "to": "4th_St_Main_St", "direction": "south", "turn": "walk straight"},
    {"from": "4th_St_Main_St", "to": "Main_St_2nd_St", "direction": "east", "turn": "turn right"},
    {"from": "Main_St_2nd_St", "to": "Bakery", "direction": "north", "turn": "turn left"}
  ],
  "total_steps": 3,
  "message": "Path found: 4 nodes, 3 steps"
}
```

### Locations Response

```json
{
  "buildings": ["Police Station", "Fire Station", "Hospital", "School", "Library", "City Hall", "Post Office", "Bank", "Bakery", "Grocery Store"],
  "street_nodes": ["1st_St_Main_St", "2nd_St_Main_St", ...],
  "all_locations": ["Police Station", "Fire Station", ...],
  "total_count": 46
}
```

## Available Locations

### Buildings

- Police Station
- Fire Station  
- Hospital
- School
- Library
- City Hall
- Post Office
- Bank
- Bakery
- Grocery Store

### Streets

- Main Street (1st to 5th)
- Oak Avenue (1st to 5th)
- Pine Street (1st to 5th)
- Elm Drive (1st to 5th)

## Turn Instructions

The API provides four types of turn instructions:

- **walk straight**: Continue in the same direction
- **turn left**: Turn 90 degrees counterclockwise
- **turn right**: Turn 90 degrees clockwise
- **turn around**: Turn 180 degrees

## Examples

### Using curl

```bash
# Get all locations (public endpoint)
curl http://localhost:8000/simpletool/locations

# Get path (POST) - with authentication
curl -X POST http://localhost:8000/simpletool/path \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-api-key-change-this" \
  -d '{"start": "Police Station", "end": "Bakery"}'

# Get path (GET) - with authentication  
curl -H "Authorization: Bearer your-secret-api-key-change-this" \
  http://localhost:8000/simpletool/path/Police%20Station/Bakery

# Get example path (public endpoint)
curl http://localhost:8000/simpletool/path/example

# Test without authentication (should return 401)
curl -X POST http://localhost:8000/simpletool/path \
  -H "Content-Type: application/json" \
  -d '{"start": "Police Station", "end": "Bakery"}'
```

### Using Python requests

```python
import requests

# API Key
API_KEY = "your-secret-api-key-change-this"
headers = {"Authorization": f"Bearer {API_KEY}"}

# Get path with authentication
response = requests.post("http://localhost:8000/simpletool/path", 
                        json={"start": "Police Station", "end": "Bakery"},
                        headers=headers)

if response.status_code == 200:
    data = response.json()
    print(f"Path: {data['path']}")
    for i, edge in enumerate(data['edges']):
        print(f"Step {i+1}: {edge['turn']} → {edge['direction']} to {edge['to']}")
else:
    print(f"Error: {response.status_code} - {response.text}")

# Test public endpoints (no auth needed)
locations = requests.get("http://localhost:8000/simpletool/locations").json()
print(f"Available locations: {len(locations['all_locations'])}")
```

## Development

The API is built on:

- **FastAPI**: Modern, fast web framework
- **NetworkX**: Graph algorithms and data structures
- **Pydantic**: Data validation and serialization
- **Uvicorn**: ASGI server

## Error Handling

The API returns appropriate HTTP status codes:

- 200: Success
- 400: Bad request (missing start/end)
- 401: Unauthorized (missing or invalid API key)
- 404: Path not found
- 500: Internal server error

### Authentication Errors

```json
{
  "detail": "Invalid API key",
  "status_code": 401
}
```

- 200: Success
- 400: Bad request (missing start/end)
- 404: Path not found
- 500: Internal server error
