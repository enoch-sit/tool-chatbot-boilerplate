# City Map Navigation System

A Python-based city map visualization and navigation system with a logical street layout and junction-based connections.

## 🗺️ Map Layout

### Street Structure

- **West Street**: W1 (North) → W2 → W3 → W4 → W5 (South)
- **North Street**: N1 (West) → N2 → N3 → N4 → N5 (East)
- **East Street**: E1 (North) → E2 → E3 (South)
- **Junction**: Central hub connecting W2 ↔ Junction ↔ N1

### Building Locations

#### West Street Buildings

- **W1**: Police Station (WEST side) - *Northernmost*
- **W2**: Junction connection point
- **W3**: Church (WEST side) ↔ Hospital (EAST side)
- **W4**: Book Shop (EAST side)
- **W5**: Post Office (WEST side) ↔ Train Station (EAST side) - *Southernmost*

#### North Street Buildings  

- **N1**: Sports Centre (SOUTH side) - *Vertical connection from above*
- **N2**: Bank (SOUTH side)
- **N3**: Fire Station (SOUTH side)

#### East Street Buildings

- **E1**: Supermarket (WEST side)
- **E2**: Bakery (WEST side)
- **E3**: Clinic (WEST side)

## 🎯 Key Features

### Junction Design

```
                    Sports Centre
                          |
    W2 ---- Junction ---- N1 ---- N2 ---- N3 ---- N4 ---- N5
     |                                                      |
    W1 (Police Station)                                    E1
     |                                                      |
    W3 (Church ↔ Hospital)                                E2
     |                                                      |
    W4 (Book Shop)                                        E3
     |
    W5 (Post Office ↔ Train Station)
```

### Navigation Logic

- **Compass-based directions**: NORTH, SOUTH, EAST, WEST
- **Building entrance/exit instructions**: Specific directional guidance
- **Junction transitions**: Clear turn instructions at intersections
- **Street-to-street navigation**: Seamless multi-street routing

## 🛠️ Technical Implementation

### Dependencies

```python
import networkx as nx
import numpy as np
import matplotlib.pyplot as plt
```

### Core Components

- **Graph Structure**: NetworkX graph with adjacency matrix
- **Node System**: 26 nodes (12 buildings + 1 junction + 13 street nodes)
- **Position Mapping**: Fixed coordinate system for visualization
- **Navigation Engine**: A* pathfinding with compass directions

## 📋 Usage

### Basic Usage

```python
python render_map_w1_w5.py
```

### Functions

- `create_detailed_map()`: Creates the graph structure
- `render_detailed_map(G)`: Visualizes the map
- `find_detailed_path(G, start, end)`: Finds optimal path
- `provide_detailed_navigation_instructions(G, start, end, pos)`: Generates step-by-step directions
- `analyze_detailed_graph(G)`: Analyzes graph properties

### Sample Navigation

The system provides detailed walking directions like:

```
🗺️ NAVIGATION: Police Station → Train Station
📋 STEP-BY-STEP INSTRUCTIONS:
1. Exit Police Station heading EAST to West Street (W1)
2. Walk SOUTH on West Street from W1 to W2
3. Walk SOUTH on West Street from W2 to W3
4. Walk SOUTH on West Street from W3 to W4
5. Walk SOUTH on West Street from W4 to W5
6. Enter Train Station from West Street (W5) - entrance faces WEST
```

## 📊 Output

### Generated Files

- `w1_w5_logical_map.png`: Visual map representation
- Console output with navigation instructions and graph analysis

### Map Features

- **Color-coded nodes**: Buildings (coral) vs Streets (blue)
- **Street labels**: Clear identification of each street
- **Proper positioning**: Geographically accurate layout
- **Connection visualization**: Clear edge representation

## 🎨 Visualization

The map uses a coordinate system where:

- **Higher Y values = NORTH** (top of map)
- **Lower Y values = SOUTH** (bottom of map)
- **Higher X values = EAST** (right of map)
- **Lower X values = WEST** (left of map)

## 🔍 Analysis Output

The system provides detailed analysis:

- Total nodes and edges count
- Categorized node lists (Buildings, Junction, Street nodes)
- Connectivity verification
- Component analysis (if disconnected)

## 🎯 Design Principles

1. **Logical Layout**: Intuitive W1-W5 numbering system
2. **Junction-based Connection**: Central hub design for street intersections
3. **Compass Navigation**: All directions use cardinal directions
4. **Building Placement**: Realistic east/west side positioning
5. **Scalable Architecture**: Easy to extend with additional streets/buildings

---

*Generated map visualization saved as `w1_w5_logical_map.png`*
