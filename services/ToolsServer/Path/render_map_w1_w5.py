import networkx as nx
import numpy as np
import matplotlib.pyplot as plt


def create_detailed_map():
    """Create detailed map with W1-W5 logical layout per user specification"""

    # Node names based on user's logical layout
    node_names = [
        # Buildings
        "Post Office",  # 0 - at W5 (WEST side)
        "Train Station",  # 1 - at W5 (EAST side)
        "Book Shop",  # 2 - at W4 (EAST side)
        "Hospital",  # 3 - at W3 (EAST side)
        "Church",  # 4 - at W3 (WEST side)
        "Police Station",  # 5 - at W1 (WEST side)
        "Sports Centre",  # 6 - at N1 (SOUTH side)
        "Bank",  # 7 - at N2 (SOUTH side)
        "Fire Station",  # 8 - at N3 (SOUTH side)
        "Supermarket",  # 9 - at E1 (WEST side)
        "Bakery",  # 10 - at E2 (WEST side)
        "Clinic",  # 11 - at E3 (WEST side)
        # Junction Node
        "Junction",  # 12 - West Street/North Street junction
        # West Street Nodes (W1 to W5, North to South)
        "W1",  # 13 - Police Station area (northernmost)
        "W2",  # 14 - West Street connects to junction
        "W3",  # 15 - Church and Hospital area
        "W4",  # 16 - Book Shop area
        "W5",  # 17 - Post Office and Train Station area (southernmost)
        # North Street Nodes (N1 to N5, West to East)
        "N1",  # 18 - North Street connects to junction
        "N2",  # 19 - One block east of N1
        "N3",  # 20 - One block east of N2
        "N4",  # 21 - One block east of N3
        "N5",  # 22 - North Street/East Street junction
        # East Street Nodes (E1 to E3, North to South)
        "E1",  # 23 - North Street/East Street junction
        "E2",  # 24 - One block south of E1
        "E3",  # 25 - One block south of E2
    ]

    # Create adjacency matrix for 26 nodes
    N = 26  # 12 buildings + 1 junction + 13 street nodes
    adj = np.zeros((N, N), dtype=int)

    # Buildings connect to specific street nodes per user's logical layout
    building_street_pairs = [
        # West Street buildings per user's specification
        (0, 17),  # Post Office -> W5 (WEST side)
        (1, 17),  # Train Station -> W5 (EAST side)
        (2, 16),  # Book Shop -> W4 (EAST side)
        (3, 15),  # Hospital -> W3 (EAST side)
        (4, 15),  # Church -> W3 (WEST side)
        (5, 13),  # Police Station -> W1 (WEST side)
        # North Street buildings
        (6, 18),  # Sports Centre -> N1 (SOUTH side)
        (7, 19),  # Bank -> N2 (SOUTH side)
        (8, 20),  # Fire Station -> N3 (SOUTH side)
        # East Street buildings
        (9, 23),  # Supermarket -> E1 (WEST side)
        (10, 24),  # Bakery -> E2 (WEST side)
        (11, 25),  # Clinic -> E3 (WEST side)
    ]

    # Add building-street connections
    for building, street in building_street_pairs:
        adj[building, street] = 1
        adj[street, building] = 1

    # Street connections
    # West Street (North to South): W1 -> W2 -> W3 -> W4 -> W5
    west_street_connections = [(13, 14), (14, 15), (15, 16), (16, 17)]

    # North Street (West to East): N1 -> N2 -> N3 -> N4 -> N5
    north_street_connections = [(18, 19), (19, 20), (20, 21), (21, 22)]

    # East Street (North to South): E1 -> E2 -> E3
    east_street_connections = [(23, 24), (24, 25)]

    # Junction connections - Junction connects W2, N1
    junction_connections = [
        (12, 14),  # Junction -> W2 (West Street connection)
        (12, 18),  # Junction -> N1 (North Street connection)
        (22, 23),  # N5 (North/East junction) -> E1
    ]  # Add all street connections
    for connections in [
        west_street_connections,
        north_street_connections,
        east_street_connections,
        junction_connections,
    ]:
        for i, j in connections:
            adj[i, j] = 1
            adj[j, i] = 1

    # Building adjacencies per user's logical layout
    # W5 - same node adjacencies
    adj[0, 1] = 1
    adj[1, 0] = 1  # Post Office ↔ Train Station (both at W5)

    # W3 - same node adjacencies
    adj[4, 3] = 1
    adj[3, 4] = 1  # Church ↔ Hospital (both at W3)

    # Building sequence adjacencies along West Street
    # WEST side buildings: Post Office (W5) -> Church (W3) -> Police Station (W1)
    adj[0, 4] = 1
    adj[4, 0] = 1  # Post Office ↔ Church
    adj[4, 5] = 1
    adj[5, 4] = 1  # Church ↔ Police Station

    # EAST side buildings: Train Station (W5) -> Book Shop (W4) -> Hospital (W3)
    adj[1, 2] = 1
    adj[2, 1] = 1  # Train Station ↔ Book Shop
    adj[2, 3] = 1
    adj[3, 2] = 1  # Book Shop ↔ Hospital

    # North Street building connections (all on SOUTH side)
    adj[6, 7] = 1
    adj[7, 6] = 1  # Sports Centre ↔ Bank
    adj[7, 8] = 1
    adj[8, 7] = 1  # Bank ↔ Fire Station

    # East Street building connections (all on WEST side)
    adj[9, 10] = 1
    adj[10, 9] = 1  # Supermarket ↔ Bakery
    adj[10, 11] = 1
    adj[11, 10] = 1  # Bakery ↔ Clinic

    # Create NetworkX graph
    G = nx.from_numpy_array(adj)

    # Relabel nodes with meaningful names
    node_mapping = {i: node_names[i] for i in range(len(node_names))}
    G = nx.relabel_nodes(G, node_mapping)

    return G


def render_detailed_map(G):
    """Render the detailed map with fixed positions"""

    pos = {
        # West Street buildings per user's logical layout
        "Police Station": (2, 12),  # W1, WEST side (northernmost - TOP)
        "Church": (2, 8),  # W3, WEST side
        "Hospital": (4, 8),  # W3, EAST side
        "Book Shop": (4, 6),  # W4, EAST side
        "Post Office": (2, 4),  # W5, WEST side
        "Train Station": (4, 4),  # W5, EAST side
        # North Street buildings (all SOUTH side when walking east)
        "Sports Centre": (7, 12),  # Above N1 (connects vertically to N1)
        "Bank": (9, 11),  # N2, SOUTH side
        "Fire Station": (11, 11),  # N3, SOUTH side
        # East Street buildings (all WEST side when walking south)
        "Supermarket": (14, 12),  # E1, WEST side
        "Bakery": (14, 10),  # E2, WEST side
        "Clinic": (14, 8),  # E3, WEST side
        # Junction node
        "Junction": (5, 10),  # West Street/North Street junction
        # West Street nodes (W1 to W5, North to South)
        "W1": (3, 12),  # Police Station area (northernmost - TOP)
        "W2": (3, 10),  # West Street connects to junction
        "W3": (3, 8),  # Church and Hospital area
        "W4": (3, 6),  # Book Shop area
        "W5": (3, 4),  # Post Office and Train Station area (southernmost - BOTTOM)
        # North Street nodes (N1 to N5, West to East)
        "N1": (7, 10),  # North Street connects to junction
        "N2": (9, 10),  # One block east
        "N3": (11, 10),  # One block east
        "N4": (13, 10),  # One block east
        "N5": (15, 10),  # East junction
        # East Street nodes (E1 to E3, North to South)
        "E1": (15, 10),  # North junction (same level as N5)
        "E2": (15, 8),  # One block south
        "E3": (15, 6),  # One block south
    }

    plt.figure(figsize=(16, 12))

    # Color nodes
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

    node_colors = []
    for node in G.nodes():
        if node in building_nodes:
            node_colors.append("lightcoral")
        else:
            node_colors.append("lightblue")

    # Draw the graph
    nx.draw_networkx_nodes(G, pos, node_color=node_colors, node_size=2000, alpha=0.9)
    nx.draw_networkx_labels(G, pos, font_size=8, font_weight="bold")
    nx.draw_networkx_edges(G, pos, edge_color="gray", width=2, alpha=0.7)

    plt.title(
        "City Map - W1-W5 Logical Layout\n"
        + "Police Station-W1, W2-Junction, Church-W3-Hospital, W4-BookShop, PostOffice-W5-TrainStation",
        fontsize=14,
        fontweight="bold",
        pad=20,
    )
    plt.axis("off")

    # Add street labels
    plt.text(
        1,
        8,
        "WEST\nSTREET",
        fontsize=10,
        ha="center",
        va="center",
        bbox=dict(boxstyle="round,pad=0.3", facecolor="yellow", alpha=0.7),
    )
    plt.text(
        9,
        11,
        "NORTH STREET",
        fontsize=10,
        ha="center",
        va="center",
        bbox=dict(boxstyle="round,pad=0.3", facecolor="yellow", alpha=0.7),
    )
    plt.text(
        16,
        8,
        "EAST\nSTREET",
        fontsize=10,
        ha="center",
        va="center",
        bbox=dict(boxstyle="round,pad=0.3", facecolor="yellow", alpha=0.7),
    )

    plt.tight_layout()
    plt.savefig("w1_w5_logical_map.png", dpi=300, bbox_inches="tight")
    plt.show()

    return pos


def find_detailed_path(G, start, end):
    """Find path between two nodes using A* algorithm"""
    try:
        path = nx.astar_path(G, start, end)
        return path
    except nx.NetworkXNoPath:
        print(f"No path found between {start} and {end}")
        return None


def provide_detailed_navigation_instructions(G, start, end, pos):
    """Generate detailed navigation instructions with compass directions"""
    path = find_detailed_path(G, start, end)
    if not path:
        return "No path found"

    instructions = []
    step = 1

    # Exit and entrance directions per user's logical layout
    exit_directions = {
        "Post Office": "Exit Post Office heading EAST to West Street (W5)",
        "Train Station": "Exit Train Station heading WEST to West Street (W5)",
        "Book Shop": "Exit Book Shop heading WEST to West Street (W4)",
        "Hospital": "Exit Hospital heading WEST to West Street (W3)",
        "Church": "Exit Church heading EAST to West Street (W3)",
        "Police Station": "Exit Police Station heading EAST to West Street (W1)",
        "Sports Centre": "Exit Sports Centre heading NORTH to North Street (N1)",
        "Bank": "Exit Bank heading NORTH to North Street (N2)",
        "Fire Station": "Exit Fire Station heading NORTH to North Street (N3)",
        "Supermarket": "Exit Supermarket heading EAST to East Street (E1)",
        "Bakery": "Exit Bakery heading EAST to East Street (E2)",
        "Clinic": "Exit Clinic heading EAST to East Street (E3)",
    }

    entrance_directions = {
        "Post Office": "Enter Post Office from West Street (W5) - entrance faces EAST",
        "Train Station": "Enter Train Station from West Street (W5) - entrance faces WEST",
        "Book Shop": "Enter Book Shop from West Street (W4) - entrance faces WEST",
        "Hospital": "Enter Hospital from West Street (W3) - entrance faces WEST",
        "Church": "Enter Church from West Street (W3) - entrance faces EAST",
        "Police Station": "Enter Police Station from West Street (W1) - entrance faces EAST",
        "Sports Centre": "Enter Sports Centre from North Street (N1) - entrance faces NORTH",
        "Bank": "Enter Bank from North Street (N2) - entrance faces NORTH",
        "Fire Station": "Enter Fire Station from North Street (N3) - entrance faces NORTH",
        "Supermarket": "Enter Supermarket from East Street (E1) - entrance faces EAST",
        "Bakery": "Enter Bakery from East Street (E2) - entrance faces EAST",
        "Clinic": "Enter Clinic from East Street (E3) - entrance faces EAST",
    }

    instructions.append(f"🗺️ NAVIGATION: {start} → {end}")
    instructions.append(f"📍 Path: {' → '.join(path)}")
    instructions.append("")
    instructions.append("📋 STEP-BY-STEP INSTRUCTIONS:")

    # Starting instruction
    if start in exit_directions:
        instructions.append(f"{step}. {exit_directions[start]}")
        step += 1

    # Navigation through path
    for i in range(len(path) - 1):
        current = path[i]
        next_node = path[i + 1]

        # Street navigation
        if current.startswith("W") and next_node.startswith("W"):
            curr_num = int(current[1:])
            next_num = int(next_node[1:])
            if next_num > curr_num:
                instructions.append(
                    f"{step}. Walk SOUTH on West Street from {current} to {next_node}"
                )
            else:
                instructions.append(
                    f"{step}. Walk NORTH on West Street from {current} to {next_node}"
                )
            step += 1
        elif current.startswith("N") and next_node.startswith("N"):
            instructions.append(
                f"{step}. Walk EAST on North Street from {current} to {next_node}"
            )
            step += 1
        elif current.startswith("E") and next_node.startswith("E"):
            curr_num = int(current[1:])
            next_num = int(next_node[1:])
            if next_num > curr_num:
                instructions.append(
                    f"{step}. Walk SOUTH on East Street from {current} to {next_node}"
                )
            else:
                instructions.append(
                    f"{step}. Walk NORTH on East Street from {current} to {next_node}"
                )
            step += 1
        # Junction transitions
        elif current == "W2" and next_node == "N1":
            instructions.append(
                f"{step}. Turn RIGHT (EAST) from West Street to North Street"
            )
            step += 1
        elif current == "N1" and next_node == "W2":
            instructions.append(
                f"{step}. Turn LEFT (WEST) from North Street to West Street"
            )
            step += 1
        elif current == "N5" and next_node == "E1":
            instructions.append(
                f"{step}. Turn RIGHT (SOUTH) from North Street to East Street"
            )
            step += 1
        elif current == "E1" and next_node == "N5":
            instructions.append(
                f"{step}. Turn LEFT (NORTH) from East Street to North Street"
            )
            step += 1

    # Arrival instruction
    if end in entrance_directions:
        instructions.append(f"{step}. {entrance_directions[end]}")

    instructions.append("\n✅ LOGICAL LAYOUT:")
    instructions.append("• Police Station at W1 (northernmost)")
    instructions.append("• W2 is West Street/North Street junction")
    instructions.append("• Church (WEST) and Hospital (EAST) at W3")
    instructions.append("• Book Shop at W4 (EAST side)")
    instructions.append("• Post Office (WEST) and Train Station (EAST) at W5")

    return "\n".join(instructions)


def analyze_detailed_graph(G):
    """Analyze the detailed graph structure"""
    print("🔍 DETAILED GRAPH ANALYSIS")
    print("=" * 50)

    print(f"Total nodes: {len(G.nodes())}")
    print(f"Total edges: {len(G.edges())}")

    # Categorize nodes
    buildings = [
        node
        for node in G.nodes()
        if isinstance(node, str)
        and not (node.startswith("W") or node.startswith("N") or node.startswith("E"))
    ]
    west_nodes = [
        node for node in G.nodes() if isinstance(node, str) and node.startswith("W")
    ]
    north_nodes = [
        node for node in G.nodes() if isinstance(node, str) and node.startswith("N")
    ]
    east_nodes = [
        node for node in G.nodes() if isinstance(node, str) and node.startswith("E")
    ]
    junction_nodes = [
        node for node in G.nodes() if isinstance(node, str) and node == "Junction"
    ]

    print(f"Buildings: {len(buildings)} - {buildings}")
    print(f"Junction nodes: {len(junction_nodes)} - {junction_nodes}")
    print(f"West Street nodes: {len(west_nodes)} - {sorted(west_nodes)}")
    print(f"North Street nodes: {len(north_nodes)} - {sorted(north_nodes)}")
    print(f"East Street nodes: {len(east_nodes)} - {sorted(east_nodes)}")

    # Check connectivity
    is_connected = nx.is_connected(G)
    print(f"Graph is connected: {is_connected}")

    if not is_connected:
        components = list(nx.connected_components(G))
        print(f"Number of components: {len(components)}")
        for i, comp in enumerate(components):
            print(f"Component {i+1}: {comp}")


def main():
    """Main function to demonstrate the detailed map"""
    print("🗺️ Creating W1-W5 Logical Layout City Map...")

    # Create the graph
    G = create_detailed_map()

    # Analyze the graph
    analyze_detailed_graph(G)

    # Render the map
    pos = render_detailed_map(G)

    print("\n🧭 SAMPLE NAVIGATION INSTRUCTIONS:")
    print("-" * 50)

    # Sample navigation
    sample_routes = [
        ("Police Station", "Train Station"),
        ("Church", "Hospital"),
        ("Post Office", "Book Shop"),
    ]

    for start, end in sample_routes:
        print(provide_detailed_navigation_instructions(G, start, end, pos))
        print()


if __name__ == "__main__":
    main()
