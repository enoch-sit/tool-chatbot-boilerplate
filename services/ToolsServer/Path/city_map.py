"""
City Map Navigation System

A comprehensive city map visualization and navigation system featuring:
- W1-W5 logical street layout (North to South)
- Junction-based street connections
- Compass-based navigation instructions
- Building placement with entrance/exit directions

Author: Generated for thankGodForJesusChrist
Date: September 2025
"""

import networkx as nx
import numpy as np
import matplotlib.pyplot as plt


def create_city_map():
    """
    Create the city map with logical W1-W5 layout.

    Returns:
        NetworkX.Graph: Complete city map graph with all buildings and streets
    """
    # Define all nodes in the system
    node_names = [
        # Buildings (0-11)
        "Post Office",
        "Train Station",
        "Book Shop",
        "Hospital",
        "Church",
        "Police Station",
        "Sports Centre",
        "Bank",
        "Fire Station",
        "Supermarket",
        "Bakery",
        "Clinic",
        # Junction (12)
        "Junction",
        # West Street (13-17): W1 (North) → W2 → W3 → W4 → W5 (South)
        "W1",
        "W2",
        "W3",
        "W4",
        "W5",
        # North Street (18-21): N1 (West) → N2 → N3 → N5 (East)
        "N1",
        "N2",
        "N3",
        "N5",
        # East Street (22-24): E1 (North) → E2 → E3 (South)
        "E1",
        "E2",
        "E3",
    ]

    # Create adjacency matrix
    N = 25  # 12 buildings + 1 junction + 12 street nodes (removed N4)
    adj = np.zeros((N, N), dtype=int)

    # Building-to-street connections
    building_connections = [
        # West Street buildings
        (0, 17),
        (1, 17),  # Post Office, Train Station → W5
        (2, 16),  # Book Shop → W4
        (3, 15),
        (4, 15),  # Hospital, Church → W3
        (5, 13),  # Police Station → W1
        # North Street buildings
        (6, 18),
        (7, 19),
        (8, 20),  # Sports Centre → N1, Bank → N2, Fire Station → N3
        # East Street buildings
        (9, 22),
        (10, 23),
        (11, 24),  # Supermarket → E1, Bakery → E2, Clinic → E3
    ]

    # Street connections
    street_connections = [
        # West Street: W1 → W2 → W3 → W4 → W5
        (13, 14),
        (14, 15),
        (15, 16),
        (16, 17),
        # North Street: N1 → N2 → N3 → N5 (removed N4)
        (18, 19),
        (19, 20),
        (20, 21),
        # East Street: E1 → E2 → E3
        (22, 23),
        (23, 24),
        # Junction connections
        (12, 14),  # Junction ↔ W2
        (12, 18),  # Junction ↔ N1
        (19, 22),  # N2 ↔ E1 (North Street/East Street junction)
    ]

    # Building-to-building adjacencies (same location or adjacent blocks)
    building_adjacencies = [
        # Same node connections
        (0, 1),  # Post Office ↔ Train Station (both at W5)
        (3, 4),  # Hospital ↔ Church (both at W3)
        # West Street building chains
        (0, 4),
        (4, 5),  # Post Office → Church → Police Station (WEST side)
        (1, 2),
        (2, 3),  # Train Station → Book Shop → Hospital (EAST side)
        # North Street building chain
        (6, 7),
        (7, 8),  # Sports Centre → Bank → Fire Station
        # East Street building chain
        (9, 10),
        (10, 11),  # Supermarket → Bakery → Clinic
    ]

    # Apply all connections
    all_connections = building_connections + street_connections + building_adjacencies
    for i, j in all_connections:
        adj[i, j] = 1
        adj[j, i] = 1

    # Create and label graph
    G = nx.from_numpy_array(adj)
    node_mapping = {i: node_names[i] for i in range(len(node_names))}
    G = nx.relabel_nodes(G, node_mapping)

    return G


def get_node_positions():
    """
    Define fixed positions for map visualization.

    Returns:
        dict: Node positions in (x, y) coordinates
    """
    return {
        # West Street buildings
        "Police Station": (2, 12),
        "Church": (2, 8),
        "Hospital": (4, 8),
        "Book Shop": (4, 6),
        "Post Office": (2, 4),
        "Train Station": (4, 4),
        # North Street buildings
        "Sports Centre": (7, 11),
        "Bank": (9, 11),
        "Fire Station": (11, 11),
        # East Street buildings
        "Supermarket": (10, 8),
        "Bakery": (10, 6),
        "Clinic": (10, 4),
        # Junction
        "Junction": (5, 10),
        # Street nodes
        "W1": (3, 12),
        "W2": (3, 10),
        "W3": (3, 8),
        "W4": (3, 6),
        "W5": (3, 4),
        "N1": (7, 10),
        "N2": (9, 10),
        "N3": (11, 10),
        "N5": (13, 10),
        "E1": (9, 8),
        "E2": (9, 6),
        "E3": (9, 4),
    }


def render_map(G, positions):
    """
    Render the city map visualization.

    Args:
        G (NetworkX.Graph): City map graph
        positions (dict): Node position coordinates

    Returns:
        dict: Position dictionary for further use
    """
    plt.figure(figsize=(16, 12))

    # Color coding
    building_nodes = [
        "Post Office",
        "Train Station",
        "Book Shop",
        "Hospital",
        "Church",
        "Police Station",
        "Sports Centre",
        "Bank",
        "Fire Station",
        "Supermarket",
        "Bakery",
        "Clinic",
    ]

    node_colors = [
        "lightcoral" if node in building_nodes else "lightblue" for node in G.nodes()
    ]

    # Draw graph
    nx.draw_networkx_nodes(
        G, positions, node_color=node_colors, node_size=2000, alpha=0.9
    )
    nx.draw_networkx_labels(G, positions, font_size=8, font_weight="bold")
    nx.draw_networkx_edges(G, positions, edge_color="gray", width=2, alpha=0.7)

    # Add street labels
    street_labels = [
        (1, 8, "WEST\nSTREET"),
        (9, 11, "NORTH STREET"),
        (11, 6, "EAST\nSTREET"),
    ]
    for x, y, label in street_labels:
        plt.text(
            x,
            y,
            label,
            fontsize=10,
            ha="center",
            va="center",
            bbox=dict(boxstyle="round,pad=0.3", facecolor="yellow", alpha=0.7),
        )

    plt.title(
        "City Map - W1-W5 Logical Layout\nPolice Station-W1, Junction, Church-W3-Hospital, W4-BookShop, PostOffice-W5-TrainStation",
        fontsize=14,
        fontweight="bold",
        pad=20,
    )
    plt.axis("off")
    plt.tight_layout()
    plt.savefig("city_map.png", dpi=300, bbox_inches="tight")
    plt.show()

    return positions


def find_path(G, start, end):
    """Find shortest path between two locations."""
    try:
        return nx.astar_path(G, start, end)
    except nx.NetworkXNoPath:
        return None


def generate_navigation_instructions(G, start, end, positions):
    """
    Generate step-by-step navigation instructions.

    Args:
        G (NetworkX.Graph): City map graph
        start (str): Starting location
        end (str): Destination location
        positions (dict): Node positions

    Returns:
        str: Formatted navigation instructions
    """
    path = find_path(G, start, end)
    if not path:
        return f"No path found from {start} to {end}"

    instructions = [
        f"🗺️ NAVIGATION: {start} → {end}",
        f"📍 Path: {' → '.join(path)}",
        "",
        "📋 STEP-BY-STEP INSTRUCTIONS:",
    ]

    # Exit directions
    exit_directions = {
        "Post Office": "Exit Post Office heading EAST to West Street (W5)",
        "Train Station": "Exit Train Station heading WEST to West Street (W5)",
        "Book Shop": "Exit Book Shop heading WEST to West Street (W4)",
        "Hospital": "Exit Hospital heading WEST to West Street (W3)",
        "Church": "Exit Church heading EAST to West Street (W3)",
        "Police Station": "Exit Police Station heading EAST to West Street (W1)",
        "Sports Centre": "Exit Sports Centre heading SOUTH to North Street (N1)",
        "Bank": "Exit Bank heading NORTH to North Street (N2)",
        "Fire Station": "Exit Fire Station heading NORTH to North Street (N3)",
        "Supermarket": "Exit Supermarket heading EAST to East Street (E1)",
        "Bakery": "Exit Bakery heading EAST to East Street (E2)",
        "Clinic": "Exit Clinic heading EAST to East Street (E3)",
    }

    step = 1
    if start in exit_directions:
        instructions.append(f"{step}. {exit_directions[start]}")
        step += 1

    # Generate path instructions
    for i in range(len(path) - 1):
        current = path[i]
        next_node = path[i + 1]

        if current.startswith("W") and next_node.startswith("W"):
            curr_num, next_num = int(current[1:]), int(next_node[1:])
            direction = "SOUTH" if next_num > curr_num else "NORTH"
            instructions.append(
                f"{step}. Walk {direction} on West Street from {current} to {next_node}"
            )
        elif current.startswith("N") and next_node.startswith("N"):
            instructions.append(
                f"{step}. Walk EAST on North Street from {current} to {next_node}"
            )
        elif current.startswith("E") and next_node.startswith("E"):
            curr_num, next_num = int(current[1:]), int(next_node[1:])
            direction = "SOUTH" if next_num > curr_num else "NORTH"
            instructions.append(
                f"{step}. Walk {direction} on East Street from {current} to {next_node}"
            )
        elif current == "W2" and next_node == "Junction":
            instructions.append(f"{step}. Proceed to Junction from West Street")
        elif current == "Junction" and next_node == "N1":
            instructions.append(
                f"{step}. Turn RIGHT (EAST) from Junction to North Street"
            )
        # Add more junction transitions as needed

        step += 1

    # Entrance directions
    entrance_directions = {
        "Post Office": "Enter Post Office from West Street (W5) - entrance faces EAST",
        "Train Station": "Enter Train Station from West Street (W5) - entrance faces WEST",
        "Book Shop": "Enter Book Shop from West Street (W4) - entrance faces WEST",
        "Hospital": "Enter Hospital from West Street (W3) - entrance faces WEST",
        "Church": "Enter Church from West Street (W3) - entrance faces EAST",
        "Police Station": "Enter Police Station from West Street (W1) - entrance faces EAST",
    }

    if end in entrance_directions:
        instructions.append(f"{step}. {entrance_directions[end]}")

    instructions.extend(
        [
            "",
            "✅ LAYOUT SUMMARY:",
            "• Police Station at W1 (northernmost)",
            "• Junction connects W2 ↔ N1",
            "• Church (WEST) and Hospital (EAST) at W3",
            "• Book Shop at W4 (EAST side)",
            "• Post Office (WEST) and Train Station (EAST) at W5",
        ]
    )

    return "\n".join(instructions)


def analyze_map(G):
    """Analyze and display map statistics."""
    print("🔍 CITY MAP ANALYSIS")
    print("=" * 50)
    print(f"Total nodes: {len(G.nodes())}")
    print(f"Total edges: {len(G.edges())}")
    print(f"Graph is connected: {nx.is_connected(G)}")

    # Categorize nodes
    buildings = [
        node
        for node in G.nodes()
        if isinstance(node, str)
        and not any(node.startswith(prefix) for prefix in ["W", "N", "E"])
        and node != "Junction"
    ]
    streets = [
        node
        for node in G.nodes()
        if isinstance(node, str)
        and any(node.startswith(prefix) for prefix in ["W", "N", "E"])
    ]
    junctions = [node for node in G.nodes() if node == "Junction"]

    print(f"Buildings: {len(buildings)}")
    print(f"Street nodes: {len(streets)}")
    print(f"Junctions: {len(junctions)}")


def main():
    """Main execution function."""
    print("🗺️ Creating City Map Navigation System...")

    # Create map
    city_map = create_city_map()
    positions = get_node_positions()

    # Analyze map
    analyze_map(city_map)

    # Render visualization
    render_map(city_map, positions)

    # Sample navigation examples
    print("\n🧭 SAMPLE NAVIGATION:")
    print("-" * 50)

    sample_routes = [
        ("Police Station", "Train Station"),
        ("Church", "Hospital"),
        ("Sports Centre", "Post Office"),
    ]

    for start, end in sample_routes:
        instructions = generate_navigation_instructions(city_map, start, end, positions)
        print(instructions)
        print()


if __name__ == "__main__":
    main()
