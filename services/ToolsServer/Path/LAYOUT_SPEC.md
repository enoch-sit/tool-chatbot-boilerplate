# City Map Logical Layout Specification

## Current Implementation: W1-W5 System

### West Street Structure (North to South)

- **W1**: Police Station (WEST side) - **Northernmost point**
- **W2**: Junction connection point
- **W3**: Church (WEST side) ↔ Hospital (EAST side)
- **W4**: Book Shop (EAST side)  
- **W5**: Post Office (WEST side) ↔ Train Station (EAST side) - **Southernmost point**

### Junction Design

```
                  Sports Centre    Bank    Fire Station
                        |           |          |
    W2 ---- Junction ---- N1 ---- N2 ---- N3 ---- N5
     |                            |                
    W1 (Police Station)          E1
     |                            |
    W3 (Church ↔ Hospital)       E2
     |                            |
    W4 (Book Shop)               E3
     |
    W5 (Post Office ↔ Train Station)
```

### Key Relationships

1. **Police Station** is at the **northernmost** point (W1)
2. **W2** serves as the junction connection to North Street
3. **Junction node** acts as central hub connecting W2 ↔ N1
4. **Sports Centre** connects vertically above N1
5. All compass directions follow standard orientation (N/S/E/W)

### Building Placement Logic

- **WEST side of West Street**: Police Station (W1) → Church (W3) → Post Office (W5)
- **EAST side of West Street**: Hospital (W3) → Book Shop (W4) → Train Station (W5)
- **North Street level**: Sports Centre (NORTH of N1) → Bank (SOUTH of N2) → Fire Station (SOUTH of N3)
- **WEST side of East Street**: Supermarket (E1) → Bakery (E2) → Clinic (E3)

### Navigation Flow

- **North-South**: W1 ↔ W2 ↔ W3 ↔ W4 ↔ W5
- **West-East**: W2 ↔ Junction ↔ N1 ↔ N2 ↔ N3 ↔ N5
- **North-South (East)**: N2 ↔ E1 ↔ E2 ↔ E3

This logical layout ensures intuitive navigation with clear compass-based directions and proper building placement.
