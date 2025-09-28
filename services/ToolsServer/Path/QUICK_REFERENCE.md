# 🗺️ Find Path Functions - Quick Reference

## Function Signatures

```python
# Simple pathfinding
path = find_path(G, start, end)
# Returns: list of nodes OR None

# Pathfinding with edge directions  
path, edges = find_path_with_edges(G, start, end)
# Returns: (list of nodes, list of edge dicts) OR (None, None)
```

## Available Locations

**Buildings**: Police Station, Church, Hospital, Book Shop, Post Office, Train Station, Sports Centre, Bank, Fire Station, Supermarket, Bakery, Clinic

**Street Nodes**: W1, W2, W3, W4, W5, N1, N2, N3, E1, E2, E3

## Basic Usage

```python
from city_map import create_city_map, find_path, find_path_with_edges

# Setup
G = create_city_map()

# Simple path
path = find_path(G, "Police Station", "Train Station")
if path:
    print(f"Route: {' → '.join(path)}")
    print(f"Steps: {len(path) - 1}")

# Path with directions
path, edges = find_path_with_edges(G, "Church", "Bakery")
if path:
    for edge in edges:
        print(f"Go {edge['direction']} from {edge['from']} to {edge['to']}")
```

## Error Handling

```python
# Always check for None
path = find_path(G, start, end)
if path is None:
    print("No route found")

# For edge version
path, edges = find_path_with_edges(G, start, end)
if path is None:
    print("No route found")
```

## Edge Dictionary Format

```python
{
    'from': 'current_node',
    'to': 'next_node',
    'direction': 'North'|'South'|'East'|'West'|'Unknown'
}
```

## Common Patterns

```python
# Distance calculation
steps = len(find_path(G, start, end)) - 1

# Reachability check
can_reach = find_path(G, start, end) is not None

# Find shortest to multiple destinations
paths = [find_path(G, start, dest) for dest in destinations]
shortest = min([p for p in paths if p], key=len)
```

---
**💡 Pro Tip**: Use `find_path()` for simple routing, `find_path_with_edges()` for navigation instructions!
