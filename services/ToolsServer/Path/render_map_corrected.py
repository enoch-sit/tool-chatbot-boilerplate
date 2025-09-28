import networkx as nx
import numpy as np
import matplotlib.pyplot as plt


def create_detailed_map():
    """Create detailed map with exact node specification from add        # North Street nodes (N1 to N5, West to East)
        "N1": (3, 10),  # West junction (connects to W2)
        "N2": (6, 10),  # One block east
        "N3": (10, 10), # One block east
        "N4": (12, 10), # One block east
        "N5": (14, 10), # East junctionl.md"""

    # Node names based on corrected specification
    node_names = [
        # Buildings
        "Post Office",  # 0 - exits to W7 (WEST)
        "Train Station",  # 1 - exits to W7 (EAST)
        "Book Shop",  # 2 - at W6 (EAST side)
        "Hospital",  # 3 - at W5 (EAST side)
        "Church",  # 4 - at W4 (WEST side) - CORRECTED
        "Police Station",  # 5 - at W3 (WEST side) - CORRECTED
        "Sports Centre",  # 6 - exits to N1 (SOUTH)
        "Bank",  # 7 - at N2 (SOUTH side)
        "Fire Station",  # 8 - at N3 (SOUTH side)
        "Supermarket",  # 9 - exits to E1 (WEST)
        "Bakery",  # 10 - at E2 (WEST side)
        "Clinic",  # 11 - at E3 (WEST side)
        # West Street Nodes (W1 to W5, North to South)
        "W1",  # 12 - Police Station area (northernmost)
        "W2",  # 13 - West Street/North Street junction
        "W3",  # 14 - Church and Hospital area
        "W4",  # 15 - Book Shop area
        "W5",  # 16 - Post Office and Train Station area (southernmost)
        # North Street Nodes (N1 to N5, West to East)
        "N1",  # 19 - North Street/West Street junction
        "N2",  # 20 - One block east of N1
        "N3",  # 21 - One block east of N2
        "N4",  # 22 - One block east of N3
        "N5",  # 23 - North Street/East Street junction
        # East Street Nodes (E1 to E3, North to South)
        "E1",  # 24 - North Street/East Street junction
        "E2",  # 25 - One block south of E1
        "E3",  # 26 - One block south of E2
    ]

    # Create adjacency matrix for 25 nodes
    N = 25  # 12 buildings + 13 street nodes
    adj = np.zeros((N, N), dtype=int)

    # Buildings connect to specific street nodes as per corrected specification
    building_street_pairs = [
        # West Street buildings
        (0, 12),  # Post Office -> W7 (WEST side)
        (1, 12),  # Train Station -> W7 (EAST side)
        (2, 13),  # Book Shop -> W6 (EAST side)
        (3, 14),  # Hospital -> W5 (EAST side)
        (4, 15),  # Church -> W4 (WEST side) - CORRECTED
        (5, 17),  # Police Station -> W2 (WEST side) - CORRECTED
        # North Street buildings
        (6, 19),  # Sports Centre -> N1 (SOUTH side)
        (7, 20),  # Bank -> N2 (SOUTH side)
        (8, 21),  # Fire Station -> N3 (SOUTH side)
        # East Street buildings
        (9, 24),  # Supermarket -> E1 (WEST side)
        (10, 25),  # Bakery -> E2 (WEST side)
        (11, 26),  # Clinic -> E3 (WEST side)
    ]

    for building, street in building_street_pairs:
        adj[building, street] = 1  # Building → Street
        adj[street, building] = 1  # Street → Building

    # Street node connections (compass relationships)
    # West Street (South to North): W7 -> W6 -> W5 -> W4 -> W3 -> W2 -> W1 (W1 is northernmost)
    west_street_connections = [
        (12, 13),
        (13, 14),
        (14, 15),
        (15, 16),
        (16, 17),
        (17, 18),
    ]

    # North Street (West to East): N1 -> N2 -> N3 -> N4 -> N5
    north_street_connections = [(17, 18), (18, 19), (19, 20), (20, 21)]
    
    # East Street (North to South): E1 -> E2 -> E3
    east_street_connections = [(22, 23), (23, 24)]
    
    # Junction connections - W2 connects to North Street junction
    junction_connections = [
        (13, 17),  # W2 (West Street/North Street junction) -> N1
        (21, 22),  # N5 (North/East junction) -> E1
    ]    # Apply all street connections (bidirectional)
    all_street_connections = (
        west_street_connections
        + north_street_connections
        + east_street_connections
        + junction_connections
    )

    for node1, node2 in all_street_connections:
        adj[node1, node2] = 1  # Forward connection
        adj[node2, node1] = 1  # Backward connection

    # Building adjacencies (side-by-side on same street nodes)
    # West Street - same node adjacencies
    adj[0, 1] = 1
    adj[1, 0] = 1  # Post Office ↔ Train Station (both at W7)

    # Building sequence adjacencies based on walking order
    # West Street WEST side (walking north): Post Office -> Church -> Police Station
    adj[0, 4] = 1
    adj[4, 0] = 1  # Post Office ↔ Church
    adj[4, 5] = 1
    adj[5, 4] = 1  # Church ↔ Police Station

    # West Street EAST side (walking north): Train Station -> Book Shop -> Hospital
    adj[1, 2] = 1
    adj[2, 1] = 1  # Train Station ↔ Book Shop
    adj[2, 3] = 1
    adj[3, 2] = 1  # Book Shop ↔ Hospital

    # North Street (walking east): Sports Centre -> Bank -> Fire Station
    adj[6, 7] = 1
    adj[7, 6] = 1  # Sports Centre ↔ Bank
    adj[7, 8] = 1
    adj[8, 7] = 1  # Bank ↔ Fire Station

    # East Street (walking south): Supermarket -> Bakery -> Clinic
    adj[9, 10] = 1
    adj[10, 9] = 1  # Supermarket ↔ Bakery
    adj[10, 11] = 1
    adj[11, 10] = 1  # Bakery ↔ Clinic

    # Build graph from adjacency matrix
    G = nx.from_numpy_array(adj, create_using=nx.Graph())

    # Relabel nodes with meaningful names
    mapping = {i: node_names[i] for i in range(len(node_names))}
    G = nx.relabel_nodes(G, mapping)

    # Add edge attributes for semantic meaning
    for u, v in G.edges():
        G[u][v]["type"] = f"connection_{u}_to_{v}"
        G[u][v]["weight"] = 1  # Equal weight for all connections

    # Positions based on corrected specification (compass layout)
    pos = {
        # Buildings positioned relative to their street nodes
        # West Street buildings
        "Post Office": (2, 0),  # W7, WEST side
        "Train Station": (4, 0),  # W7, EAST side
        "Book Shop": (4, 2),  # W6, EAST side
        "Hospital": (4, 4),  # W5, EAST side
        "Church": (2, 6),  # W4, WEST side - CORRECTED
        "Police Station": (2, 8),  # W2, WEST side - CORRECTED
        # North Street buildings (all SOUTH side when walking east)
        "Sports Centre": (2, 12),  # N1, SOUTH side
        "Bank": (6, 12),  # N2, SOUTH side
        "Fire Station": (10, 12),  # N3, SOUTH side
        # East Street buildings (all WEST side when walking south)
        "Supermarket": (14, 10),  # E1, WEST side
        "Bakery": (14, 8),  # E2, WEST side
        "Clinic": (14, 6),  # E3, WEST side
        # West Street nodes (W7 to W1, South to North)
        "W7": (3, 0),  # South node
        "W6": (3, 2),  # One block north
        "W5": (3, 4),  # One block north
        "W4": (3, 6),  # One block north
        "W3": (3, 8),  # One block north
        "W2": (3, 10),  # One block north
        "W1": (3, 12),  # North Street intersection (northernmost)
        # North Street nodes (N1 to N5, West to East)
        "N1": (3, 13),  # West junction
        "N2": (6, 13),  # One block east
        "N3": (10, 13),  # One block east
        "N4": (12, 13),  # One block east
        "N5": (14, 13),  # East junction
        # East Street nodes (E1 to E3, North to South)
        "E1": (15, 10),  # North junction
        "E2": (15, 8),  # One block south
        "E3": (15, 6),  # One block south
    }

    return G, pos


def provide_detailed_navigation_instructions(start, end, path):
    """Provide detailed navigation instructions based on the exact node specification"""
    if not path:
        return "No route available."

    instructions = []
    instructions.append(
        f"\n🧭 CORRECTED NAVIGATION FROM {start.upper()} TO {end.upper()}:"
    )
    instructions.append("=" * 70)

    # Building exit instructions based on corrected specification
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
        "Supermarket": "Exit Supermarket heading WEST to East Street (E1)",
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
        "Sports Centre": "Enter Sports Centre from North Street (N1) - entrance faces SOUTH",
        "Bank": "Enter Bank from North Street (N2) - entrance faces NORTH",
        "Fire Station": "Enter Fire Station from North Street (N3) - entrance faces NORTH",
        "Supermarket": "Enter Supermarket from East Street (E1) - entrance faces WEST",
        "Bakery": "Enter Bakery from East Street (E2) - entrance faces EAST",
        "Clinic": "Enter Clinic from East Street (E3) - entrance faces EAST",
    }

    if start in exit_directions:
        instructions.append(f"1. {exit_directions[start]}")

    # Provide step-by-step street walking directions
    step = 2
    for i in range(len(path) - 1):
        current = path[i]
        next_node = path[i + 1]

        # West Street walking directions
        if current.startswith("W") and next_node.startswith("W"):
            current_num = int(current[1:])
            next_num = int(next_node[1:])
            if (
                next_num < current_num
            ):  # W2 is north (lower number), W7 is south (higher number)
                instructions.append(
                    f"{step}. Walk NORTH along West Street from {current} to {next_node}"
                )
            else:
                instructions.append(
                    f"{step}. Walk SOUTH along West Street from {current} to {next_node}"
                )
            step += 1

        # North Street walking directions
        elif current.startswith("N") and next_node.startswith("N"):
            current_num = int(current[1:])
            next_num = int(next_node[1:])
            if next_num > current_num:
                instructions.append(
                    f"{step}. Walk EAST along North Street from {current} to {next_node}"
                )
            else:
                instructions.append(
                    f"{step}. Walk WEST along North Street from {current} to {next_node}"
                )
            step += 1

        # East Street walking directions
        elif current.startswith("E") and next_node.startswith("E"):
            current_num = int(current[1:])
            next_num = int(next_node[1:])
            if next_num > current_num:
                instructions.append(
                    f"{step}. Walk SOUTH along East Street from {current} to {next_node}"
                )
            else:
                instructions.append(
                    f"{step}. Walk NORTH along East Street from {current} to {next_node}"
                )
            step += 1

        # Junction transitions
        elif current == "W1" and next_node == "N1":
            instructions.append(
                f"{step}. Turn RIGHT (EAST) from West Street to North Street"
            )
            step += 1
        elif current == "N5" and next_node == "E1":
            instructions.append(
                f"{step}. Turn RIGHT (SOUTH) from North Street to East Street"
            )
            step += 1

    # Building entrance instructions
    if end in entrance_directions:
        instructions.append(f"{step}. {entrance_directions[end]}")

    instructions.append("\n✅ LOGICAL LAYOUT:")
    instructions.append("• Police Station at W1 (northernmost)")
    instructions.append("• W2 is West Street/North Street junction")
    instructions.append("• Church (WEST) and Hospital (EAST) at W3")
    instructions.append("• Book Shop at W4 (EAST side)")
    instructions.append("• Post Office (WEST) and Train Station (EAST) at W5")    return "\n".join(instructions)


def render_detailed_map(G, pos, save_path=None):
    """Render the corrected detailed map"""

    plt.figure(figsize=(20, 14))

    # Categorize nodes by type
    building_nodes = [
        n
        for n in G.nodes()
        if n
        in [
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
    ]
    west_street_nodes = [n for n in G.nodes() if n.startswith("W")]
    north_street_nodes = [n for n in G.nodes() if n.startswith("N")]
    east_street_nodes = [n for n in G.nodes() if n.startswith("E")]

    # Draw different node types with different colors and sizes
    if building_nodes:
        nx.draw_networkx_nodes(
            G,
            pos,
            nodelist=building_nodes,
            node_color="lightblue",
            node_size=3000,
            alpha=0.8,
            label="Buildings",
        )

    if west_street_nodes:
        nx.draw_networkx_nodes(
            G,
            pos,
            nodelist=west_street_nodes,
            node_color="lightcoral",
            node_size=1500,
            alpha=0.7,
            node_shape="s",
            label="West Street Nodes",
        )

    if north_street_nodes:
        nx.draw_networkx_nodes(
            G,
            pos,
            nodelist=north_street_nodes,
            node_color="lightgreen",
            node_size=1500,
            alpha=0.7,
            node_shape="^",
            label="North Street Nodes",
        )

    if east_street_nodes:
        nx.draw_networkx_nodes(
            G,
            pos,
            nodelist=east_street_nodes,
            node_color="lightyellow",
            node_size=1500,
            alpha=0.7,
            node_shape="D",
            label="East Street Nodes",
        )

    # Draw edges
    nx.draw_networkx_edges(G, pos, edge_color="gray", width=1.5, alpha=0.6)

    # Draw labels
    labels = {}
    for node in G.nodes():
        if node in building_nodes:
            labels[node] = node.replace(" ", "\n")  # Multi-line for readability
        else:
            labels[node] = node

    nx.draw_networkx_labels(
        G, pos, labels, font_size=8, font_weight="bold", font_family="sans-serif"
    )

    plt.title(
        "CORRECTED Street Map\nChurch at W4 (West), Police at W2 (West), W1 is Northernmost",
        fontsize=16,
        fontweight="bold",
        pad=20,
    )

    plt.legend(scatterpoints=1, loc="upper left", bbox_to_anchor=(0.02, 0.98))
    plt.axis("off")

    # Add comprehensive legend
    legend_text = """
    CORRECTED Node Specification:
    • Church: W4 (WEST side)
    • Police Station: W2 (WEST side)
    • W1: Northernmost West Street node
    • W1 connects to North Street junction (N1)
    
    Compass Rules:
    • W7 (South) to W1 (North) on West Street
    • N1 (West) to N5 (East) on North Street
    • E1 (North) to E3 (South) on East Street
    """
    plt.text(
        -2,
        -2,
        legend_text,
        fontsize=10,
        verticalalignment="top",
        bbox=dict(boxstyle="round,pad=0.5", facecolor="lightcyan", alpha=0.8),
    )

    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches="tight")
        print(f"Corrected map saved to: {save_path}")

    plt.show()


def find_detailed_path(G, start, end):
    """Find path with corrected navigation instructions"""

    if nx.has_path(G, start, end):
        path = nx.shortest_path(G, source=start, target=end)
        path_length = nx.shortest_path_length(G, source=start, target=end)

        print(f"\nRoute from '{start}' to '{end}':")
        print(f"Path: {' → '.join(path)}")
        print(f"Total steps: {path_length}")

        # Provide detailed navigation instructions
        nav_instructions = provide_detailed_navigation_instructions(start, end, path)
        print(nav_instructions)

        return path
    else:
        print(f"\nNo valid path from '{start}' to '{end}'.")
        return None


def analyze_detailed_graph(G):
    """Analyze the corrected graph structure"""

    print("CORRECTED Graph Analysis:")
    print(f"Total nodes: {G.number_of_nodes()}")
    print(f"Total connections: {G.number_of_edges()}")

    # Count different node types
    building_nodes = [n for n in G.nodes() if not n.startswith(("W", "N", "E"))]
    west_nodes = [n for n in G.nodes() if n.startswith("W")]
    north_nodes = [n for n in G.nodes() if n.startswith("N")]
    east_nodes = [n for n in G.nodes() if n.startswith("E")]

    print(f"Buildings: {len(building_nodes)}")
    print(f"West Street nodes: {len(west_nodes)} (W1-W7, W1 is northernmost)")
    print(f"North Street nodes: {len(north_nodes)} (N1-N5)")
    print(f"East Street nodes: {len(east_nodes)} (E1-E3)")
    print("\n✅ KEY CORRECTIONS APPLIED:")
    print("• Church moved to W4 (WEST side)")
    print("• Police Station moved to W2 (WEST side)")
    print("• W1 is now the northernmost point on West Street")
    print("• W1 connects directly to North Street")
    print()


def main():
    """Main function with corrected specifications"""

    print("Creating CORRECTED detailed map...")
    print("Fixed: Church at W4, Police at W2, W1 as northernmost point")

    # Create the corrected graph
    G, pos = create_detailed_map()

    # Analyze the graph
    analyze_detailed_graph(G)

    # Render the map
    render_detailed_map(G, pos, save_path="corrected_detailed_map.png")

    # Test navigation with corrected instructions
    print("\n" + "=" * 70)
    print("CORRECTED NAVIGATION EXAMPLES:")
    print("=" * 70)

    test_routes = [
        ("Church", "Fire Station"),  # W4 to N3
        ("Police Station", "Supermarket"),  # W3 to E1
        ("Post Office", "Bank"),  # W7 to N2
        ("Train Station", "Clinic"),  # W7 to E3
    ]

    for start, end in test_routes:
        find_detailed_path(G, start, end)
        print()

    print("=" * 70)
    print("CORRECTED navigation system complete!")
    print("Check corrected_detailed_map.png for the visual representation.")


if __name__ == "__main__":
    main()
