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
  "path": ["Police Station", "W1", "W2", "N1", "N2", "E1", "Supermarket"],
  "edges": [
    {"from": "Police Station", "to": "W1", "direction": "East", "turn": "start"},
    {"from": "W1", "to": "W2", "direction": "South", "turn": "right"},
    {"from": "W2", "to": "N1", "direction": "East", "turn": "left"},
    {"from": "N1", "to": "N2", "direction": "East", "turn": "straight"},
    {"from": "N2", "to": "E1", "direction": "South", "turn": "right"},
    {"from": "E1", "to": "Supermarket", "direction": "East", "turn": "left"}
  ],
  "total_steps": 6,
  "message": "Path found: 7 nodes, 6 steps"
}
```

### Locations Response

```json
{
  "buildings": ["Post Office", "Train Station", "Book Shop", "Hospital", "Church", "Police Station", "Sports Centre", "Bank", "Fire Station", "Supermarket", "Bakery", "Clinic"],
  "street_nodes": ["W1", "W2", "W3", "W4", "W5", "N1", "N2", "N3", "E1", "E2", "E3"],
  "all_locations": ["Post Office", "Train Station", "Book Shop", "Hospital", "Church", "Police Station", "Sports Centre", "Bank", "Fire Station", "Supermarket", "Bakery", "Clinic", "W1", "W2", "W3", "W4", "W5", "N1", "N2", "N3", "E1", "E2", "E3"],
  "total_count": 23
}
```

## Available Locations

### Buildings

- Post Office
- Train Station
- Book Shop
- Hospital
- Church
- Police Station
- Sports Centre
- Bank
- Fire Station
- Supermarket
- Bakery
- Clinic

### Streets

- West Street (nodes W1-W5)
- North Street (nodes N1-N3)
- East Street (nodes E1-E3)

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

## Integration with Flowise

### JavaScript Function for Flowise Custom Tool

You can integrate this Path Tool API into Flowise using a custom JavaScript function:

```javascript
/*
* Path Tool API Integration for Flowise
* You can use properties specified in Input Schema as variables. Ex: Property = startLocation, Variable = $startLocation
* You can get default flow config: $flow.sessionId, $flow.chatId, $flow.chatflowId, $flow.input, $flow.state
* Must return a string value at the end of function
*/

const fetch = require('node-fetch');

// Configuration - update these values for your deployment
const API_BASE_URL = 'http://localhost:8000/simpletool';  // Change to your server URL
const API_KEY = 'your-secret-api-key-change-this';        // Change to your actual API key

// Extract start and end locations from input variables
const startLocation = $startLocation || 'Police Station';  // Default fallback
const endLocation = $endLocation || 'Bakery';              // Default fallback

const url = `${API_BASE_URL}/path`;
const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
        start: startLocation,
        end: endLocation
    })
};

try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
        if (response.status === 401) {
            return 'Error: Invalid API key. Please check your authentication.';
        } else if (response.status === 404) {
            return `Error: No path found from ${startLocation} to ${endLocation}.`;
        } else {
            return `Error: API request failed with status ${response.status}`;
        }
    }
    
    const data = await response.json();
    
    if (!data.success) {
        return data.message || 'No path found between the specified locations.';
    }
    
    // Format the response as a readable string with turn-by-turn directions
    let result = `🗺️ Path from ${startLocation} to ${endLocation}:\n\n`;
    result += `Route: ${data.path.join(' → ')}\n\n`;
    result += `Turn-by-turn directions (${data.total_steps} steps):\n`;
    
    data.edges.forEach((edge, index) => {
        const stepNum = index + 1;
        const from = edge.from;
        const to = edge.to;
        const direction = edge.direction.toLowerCase();
        const turn = edge.turn;
        
        // Create meaningful, complete sentences
        let instruction = '';
        
        if (turn === 'start') {
            instruction = `Begin your journey by walking ${direction} from ${from} to ${to}.`;
        } else if (turn === 'straight') {
            instruction = `Continue walking straight ${direction} from ${from} to ${to}.`;
        } else if (turn === 'left') {
            instruction = `Turn left and walk ${direction} from ${from} to ${to}.`;
        } else if (turn === 'right') {
            instruction = `Turn right and walk ${direction} from ${from} to ${to}.`;
        } else if (turn === 'around') {
            instruction = `Turn around and walk ${direction} from ${from} to ${to}.`;
        } else {
            instruction = `From ${from}, ${turn} and walk ${direction} to ${to}.`;
        }
        
        result += `${stepNum}. ${instruction}\n`;
    });
    
    return result;
    
} catch (error) {
    console.error('Path Tool API Error:', error);
    return `Error calling Path Tool API: ${error.message}`;
}
```

### Example Output

When a user asks for directions from "Police Station" to "Bakery", the JavaScript function will return:

```text
🗺️ Path from Police Station to Bakery:

Route: Police Station → W1 → W2 → N1 → N2 → E1 → Supermarket → Bakery

Turn-by-turn directions (7 steps):
1. Begin your journey by walking east from Police Station to W1.
2. Turn right and walk south from W1 to W2.
3. Turn left and walk east from W2 to N1.
4. Continue walking straight east from N1 to N2.
5. Turn right and walk south from N2 to E1.
6. Turn right and walk west from E1 to Supermarket.
7. Turn left and walk south from Supermarket to Bakery.
```

### Flowise Setup Instructions

1. **Create Custom Tool in Flowise**:
   - Add a new Custom Tool node
   - Set the tool name: `Path Finder`
   - Set description: `Find shortest path between two locations with turn-by-turn directions`

2. **Configure Input Schema**:

   ```json
   {
     "type": "object",
     "properties": {
       "startLocation": {
         "type": "string",
         "description": "Starting location name"
       },
       "endLocation": {
         "type": "string", 
         "description": "Destination location name"
       }
     },
     "required": ["startLocation", "endLocation"]
   }
   ```

3. **Update Configuration**:
   - Change `API_BASE_URL` to your actual server URL
   - Change `API_KEY` to your actual API key from environment variables

4. **Available Locations**:
   - **Buildings**: Post Office, Train Station, Book Shop, Hospital, Church, Police Station, Sports Centre, Bank, Fire Station, Supermarket, Bakery, Clinic
   - **Street Nodes**: W1, W2, W3, W4, W5, N1, N2, N3, E1, E2, E3

### Alternative GET Version

For simpler implementations, you can use the GET endpoint:

```javascript
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:8000/simpletool';
const API_KEY = 'your-secret-api-key-change-this';

const startLocation = $startLocation || 'Police Station';
const endLocation = $endLocation || 'Bakery';

const encodedStart = encodeURIComponent(startLocation);
const encodedEnd = encodeURIComponent(endLocation);

const url = `${API_BASE_URL}/path/${encodedStart}/${encodedEnd}`;
const options = {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${API_KEY}`
    }
};

try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!data.success) {
        return data.message || 'No path found.';
    }
    
    return `Path: ${data.path.join(' → ')} (${data.total_steps} steps)`;
    
} catch (error) {
    return `Error: ${error.message}`;
}
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
