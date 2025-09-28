# 🗺️ City Map Find Path Functions - User Guide

## Overview

The City Map Navigation System provides two main pathfinding functions for different use cases:

1. **`find_path(G, start, end)`** - Simple path finding
2. **`find_path_with_edges(G, start, end)`** - Path finding with detailed edge information

## 🚀 Quick Start

### Basic Setup

```python
from city_map import create_city_map, find_path, find_path_with_edges

# Create the city map
G = create_city_map()

# Find a simple path
path = find_path(G, "Police Station", "Train Station")
print(path)
# Output: ['Police Station', 'Church', 'Post Office', 'Train Station']
```

## 📍 Available Locations

### Buildings (12 total)

```python
buildings = [
    "Post Office",      # W5 - West side
    "Train Station",    # W5 - East side  
    "Book Shop",        # W4 - East side
    "Hospital",         # W3 - East side
    "Church",           # W3 - West side
    "Police Station",   # W1 - West side
    "Sports Centre",    # N1 - South side
    "Bank",             # N2 - South side
    "Fire Station",     # N3 - South side
    "Supermarket",      # E1 - West side
    "Bakery",           # E2 - West side
    "Clinic"            # E3 - West side
]
```

### Street Nodes (11 total)

```python
street_nodes = [
    # West Street (North to South)
    "W1", "W2", "W3", "W4", "W5",
    
    # North Street (West to East)
    "N1", "N2", "N3",
    
    # East Street (North to South)
    "E1", "E2", "E3"
]
```

## 🛠️ Function Details

### 1. `find_path(G, start, end)`

**Purpose**: Simple pathfinding between two locations.

**Parameters**:

- `G` (NetworkX.DiGraph): City map graph
- `start` (str): Starting location name
- `end` (str): Destination location name

**Returns**:

- `list`: Ordered list of nodes in the path
- `None`: If no path exists

**Example**:

```python
# Building to building
path = find_path(G, "Police Station", "Hospital")
print(path)
# Output: ['Police Station', 'W1', 'W2', 'W3', 'Hospital']

# Building to street node
path = find_path(G, "Sports Centre", "E1")
print(path)
# Output: ['Sports Centre', 'N1', 'N2', 'E1']
```

### 2. `find_path_with_edges(G, start, end)`

**Purpose**: Pathfinding with detailed edge information for navigation.

**Parameters**:

- `G` (NetworkX.DiGraph): City map graph
- `start` (str): Starting location name
- `end` (str): Destination location name

**Returns**:

- `tuple`: (path_nodes, path_edges)
  - `path_nodes` (list): Ordered list of nodes
  - `path_edges` (list): List of edge dictionaries with direction info
- `(None, None)`: If no path exists

**Edge Dictionary Format**:

```python
{
    'from': 'current_node',
    'to': 'next_node', 
    'direction': 'North'|'South'|'East'|'West'|'Unknown'
}
```

**Example**:

```python
path, edges = find_path_with_edges(G, "Church", "Bakery")

print("Path:", path)
# Output: ['Church', 'W3', 'W2', 'N1', 'N2', 'E1', 'E2', 'Bakery']

print("Edge Information:")
for edge in edges:
    print(f"  {edge['from']} → {edge['to']}: {edge['direction']}")
# Output:
#   Church → W3: East
#   W3 → W2: North  
#   W2 → N1: East
#   N1 → N2: East
#   N2 → E1: South
#   E1 → E2: South
#   E2 → Bakery: West
```

## 🎯 Usage Patterns

### Pattern 1: Simple Navigation Check

```python
def can_reach(start, end):
    """Check if destination is reachable"""
    path = find_path(G, start, end)
    return path is not None

# Usage
if can_reach("Police Station", "Clinic"):
    print("Route available!")
```

### Pattern 2: Distance Calculation

```python
def get_path_length(start, end):
    """Get number of steps in path"""
    path = find_path(G, start, end)
    return len(path) - 1 if path else float('inf')

# Usage
steps = get_path_length("Sports Centre", "Post Office")
print(f"Distance: {steps} steps")
```

### Pattern 3: Detailed Navigation

```python
def get_turn_by_turn_directions(start, end):
    """Get detailed navigation with compass directions"""
    path, edges = find_path_with_edges(G, start, end)
    
    if not path:
        return "No route found"
    
    directions = []
    for edge in edges:
        directions.append(
            f"Go {edge['direction']} from {edge['from']} to {edge['to']}"
        )
    
    return directions

# Usage  
directions = get_turn_by_turn_directions("Bank", "Train Station")
for step in directions:
    print(step)
```

### Pattern 4: Multiple Destination Planning

```python
def find_shortest_route_to_multiple(start, destinations):
    """Find shortest path to any of multiple destinations"""
    shortest_path = None
    shortest_length = float('inf')
    
    for dest in destinations:
        path = find_path(G, start, dest)
        if path and len(path) < shortest_length:
            shortest_path = path
            shortest_length = len(path)
    
    return shortest_path

# Usage
emergency_services = ["Police Station", "Fire Station", "Hospital"]
path = find_shortest_route_to_multiple("Sports Centre", emergency_services)
```

## 🚨 Error Handling

### Common Issues and Solutions

```python
def safe_find_path(start, end):
    """Safe pathfinding with error handling"""
    
    # Check if nodes exist
    if start not in G.nodes:
        return f"Error: '{start}' is not a valid location"
    if end not in G.nodes:
        return f"Error: '{end}' is not a valid location"
    
    # Find path
    path = find_path(G, start, end)
    
    if path is None:
        return f"No path exists between '{start}' and '{end}'"
    
    return path

# Usage
result = safe_find_path("Police Station", "InvalidLocation")
print(result)  # Error: 'InvalidLocation' is not a valid location
```

## 🔍 Debugging Tips

### 1. Verify Node Names

```python
# List all available locations
print("Buildings:", [n for n in G.nodes if not n.startswith(('W', 'N', 'E'))])
print("Street Nodes:", [n for n in G.nodes if n.startswith(('W', 'N', 'E'))])
```

### 2. Check Connectivity

```python
def check_connectivity(node):
    """Check what's directly connected to a node"""
    neighbors = list(G.neighbors(node))
    print(f"{node} connects to: {neighbors}")

# Usage
check_connectivity("W2")  # Should show N1 connection
```

### 3. Visualize Path

```python
def print_path_details(start, end):
    """Print detailed path information"""
    path, edges = find_path_with_edges(G, start, end)
    
    if not path:
        print(f"No path from {start} to {end}")
        return
    
    print(f"Path: {' → '.join(path)}")
    print(f"Total steps: {len(path) - 1}")
    print("Directions:")
    for i, edge in enumerate(edges, 1):
        print(f"  {i}. {edge['direction']} from {edge['from']} to {edge['to']}")

# Usage
print_path_details("Police Station", "Bakery")
```

## 🎨 Integration with Visualization

```python
def highlight_path_on_map(start, end):
    """Highlight a path on the map visualization"""
    from city_map import get_node_positions, render_map
    
    path = find_path(G, start, end)
    if not path:
        print("No path to highlight")
        return
    
    positions = get_node_positions()
    
    # Render map with highlighted path
    render_map(G, positions, highlight_path=path)
    print(f"Path highlighted: {' → '.join(path)}")
```

## 📊 Performance Notes

- **Algorithm**: Uses Dijkstra's algorithm for optimal pathfinding
- **Time Complexity**: O(E + V log V) where E=edges, V=vertices
- **Space Complexity**: O(V) for storing distances and paths
- **Graph Size**: 23 nodes, 64 directed edges (manageable for real-time use)

## 🎯 Best Practices

1. **Always check for None returns** when pathfinding might fail
2. **Use `find_path_with_edges()`** when you need navigation instructions
3. **Cache frequently used paths** for better performance
4. **Validate input location names** before pathfinding
5. **Handle edge cases** like same start/end locations

---

**Ready to navigate the city? Start with `create_city_map()` and explore! 🗺️**
