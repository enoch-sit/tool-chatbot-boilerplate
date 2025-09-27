Absolutely! Let's **explicitly include street names, building exits/entrances, and intersections** in our semantic map.

We'll organize the **adjacency matrix** so that it models:

- **Buildings** (with their exits/entrances facing specific streets)
- **Named street segments**
- **Key intersections (junctions)**

We will treat **street intersections as nodes**, and **exits/entrances** will be modeled as directed edges from buildings onto adjacent streets or intersections, exactly as per your map.

---

## **Semantic Map Nodes**

Let's define **nodes** for:

- Buildings (with street-facing exits)
- Street segments (e.g., "West Street", "North Street", "East Street")
- Intersections (e.g., "West/North Junction", "North/East Junction")

### **Node List**

| Index | Node Type   | Name/Description                |
|-------|-------------|---------------------------------|
| 0     | Building    | Police Station (West Street)    |
| 1     | Building    | Church (West Street)            |
| 2     | Building    | Post Office (West Street)       |
| 3     | Building    | Hospital (West Street)          |
| 4     | Building    | Book Shop (West Street)         |
| 5     | Building    | Train Station (West Street)     |
| 6     | Building    | Sports Centre (North Street)    |
| 7     | Building    | Bank (North Street)             |
| 8     | Building    | Fire Station (North Street)     |
| 9     | Building    | Supermarket (East Street)       |
| 10    | Building    | Bakery (East Street)            |
| 11    | Building    | Clinic (East Street)            |
| 12    | Street      | West Street                     |
| 13    | Street      | North Street                    |
| 14    | Street      | East Street                     |
| 15    | Intersection| West/North Junction             |
| 16    | Intersection| North/East Junction             |

---

## **Street Entrances/Exits**

- All **buildings** have direct exits to their adjacent street.
- Street segments connect to **intersections** at appropriate places.
- **Junctions** link the streets.

---

## **Adjacency Matrix Construction**

We'll define the adjacency as:

- Building → Adjacent Street (where its entrance faces)
- Street → Building(s) (can enter directly from street)
- Street → Intersection (at end)
- Intersection ↔ Street (can go either way)
- Intersections connect to each other via North Street

---

### **Python Code**

```python
import numpy as np

# Node indices (see table above for mapping)
N = 17  # 12 buildings + 3 streets + 2 intersections
adj = np.zeros((N, N), dtype=int)

# Buildings <-> Streets
# West Street Buildings
adj[0, 12] = 1  # Police Station → West Street
adj[1, 12] = 1  # Church → West Street
adj[2, 12] = 1  # Post Office → West Street
adj[3, 12] = 1  # Hospital → West Street
adj[4, 12] = 1  # Book Shop → West Street
adj[5, 12] = 1  # Train Station → West Street
# Similarly, people can enter the building from the street:
adj[12, 0] = 1
adj[12, 1] = 1
adj[12, 2] = 1
adj[12, 3] = 1
adj[12, 4] = 1
adj[12, 5] = 1

# North Street Buildings
adj[6, 13] = 1  # Sports Centre → North Street
adj[7, 13] = 1  # Bank → North Street
adj[8, 13] = 1  # Fire Station → North Street
adj[13, 6] = 1
adj[13, 7] = 1
adj[13, 8] = 1

# East Street Buildings
adj[9, 14] = 1  # Supermarket → East Street
adj[10, 14] = 1 # Bakery → East Street
adj[11, 14] = 1 # Clinic → East Street
adj[14, 9] = 1
adj[14, 10] = 1
adj[14, 11] = 1

# Streets <-> Intersections
adj[12, 15] = 1  # West Street → West/North Junction
adj[15, 12] = 1  # Junction → West Street

adj[13, 15] = 1  # North Street → West/North Junction
adj[15, 13] = 1  # Junction → North Street

adj[13, 16] = 1  # North Street → North/East Junction
adj[16, 13] = 1  # Junction → North Street

adj[14, 16] = 1  # East Street → North/East Junction
adj[16, 14] = 1  # Junction → East Street

# Intersections <-> Intersections (via North Street)
adj[15, 16] = 1  # West/North → North/East via North Street
adj[16, 15] = 1

# Now, model walkable adjacency within each street (for buildings):
# West Street adjacency
adj[0, 1] = 1  # Police Station to Church
adj[1, 2] = 1  # Church to Post Office
adj[2, 1] = 1  # Post Office to Church
adj[1, 0] = 1  # Church to Police Station

adj[3, 4] = 1  # Hospital to Book Shop
adj[4, 5] = 1  # Book Shop to Train Station
adj[5, 4] = 1  # Train Station to Book Shop
adj[4, 3] = 1  # Book Shop to Hospital

# North Street adjacency
adj[6, 7] = 1  # Sports Centre to Bank
adj[7, 8] = 1  # Bank to Fire Station
adj[8, 7] = 1  # Fire Station to Bank
adj[7, 6] = 1  # Bank to Sports Centre

# East Street adjacency
adj[9, 10] = 1  # Supermarket to Bakery
adj[10, 11] = 1 # Bakery to Clinic
adj[11, 10] = 1 # Clinic to Bakery
adj[10, 9] = 1  # Bakery to Supermarket

# North Street intersection connections to other streets (crossing from West to East Street)
# (e.g., if you are at the junction, you can access all street nodes)
adj[15, 12] = 1  # West/North junction to West Street
adj[16, 14] = 1  # North/East Junction to East Street

# Optionally: Add direct connections for buildings that are at the junctions:
# From Police Station (0) to West/North Junction (15) (since it's at the north end of West Street)
adj[0, 15] = 1
adj[15, 0] = 1

# From Supermarket (9) to North/East Junction (16) (since it's at the north end of East Street)
adj[9, 16] = 1
adj[16, 9] = 1

# Node names for reference
node_names = [
    "Police Station (West St)", "Church (West St)", "Post Office (West St)",
    "Hospital (West St)", "Book Shop (West St)", "Train Station (West St)",
    "Sports Centre (North St)", "Bank (North St)", "Fire Station (North St)",
    "Supermarket (East St)", "Bakery (East St)", "Clinic (East St)",
    "West Street", "North Street", "East Street",
    "West/North Junction", "North/East Junction"
]

# For display
import pandas as pd
df = pd.DataFrame(adj, columns=node_names, index=node_names)
print(df)
```

---

## **Semantic Design**

- **Buildings** exit onto their named street.
- **Streets** connect to **intersections** (junctions).
- **You can transfer** from one street to another **via the junctions**.
- **Entrances/exits** are shown as directed connections.
- **Intersections** act as street crossing nodes.

---

### **If you want a visualization (with NetworkX):**

Let me know if you want a **customized graph layout with streets and intersections labeled**, or if you need this as a diagram!

---

**This model now includes:**

- Building <-> Street connections
- Street <-> Intersection connections
- Street names
- Intersection nodes for routing!

Let me know if you want a diagram or further code!
