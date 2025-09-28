import networkx as nx
import numpy as np
import matplotlib.pyplot as plt


def create_directed_map():
    """Create semantic map with buildings, streets, and intersections"""

    # Node names based on detailed navigation guide
    node_names = [
        # West Street Buildings (Left side - west side when walking north)
        "Post Office",  # 0 - South end, left side
        "Church",  # 1 - Middle, left side
        "Police Station",  # 2 - North end, left side
        # West Street Buildings (Right side - east side when walking north)
        "Train Station",  # 3 - South end, right side
        "Book Shop",  # 4 - Middle, right side
        "Hospital",  # 5 - North end, right side
        # North Street Buildings (all on left/south side when walking east)
        "Sports Centre",  # 6 - West end
        "Bank",  # 7 - Middle
        "Fire Station",  # 8 - East end
        # East Street Buildings (all on left/west side when walking south)
        "Supermarket",  # 9 - North end
        "Bakery",  # 10 - Middle
        "Clinic",  # 11 - South end
        # Street Nodes
        "West Street Node",  # 12 - Main West Street
        "North Street Node",  # 13 - Main North Street
        "East Street Node",  # 14 - Main East Street
        # Junctions
        "West/North Junction",  # 15 - Connection between West St and North St
        "North/East Junction",  # 16 - Connection between North St and East St
    ]

    # Create adjacency matrix for 28 nodes
    N = 28  # 12 buildings + 16 street nodes
    adj = np.zeros((N, N), dtype=int)

    # Buildings connect to their respective street nodes
    building_street_pairs = [
        # West Street buildings (all connect to West Street Node)
        (0, 12),  # Post Office -> West Street
        (1, 12),  # Church -> West Street
        (2, 12),  # Police Station -> West Street
        (3, 12),  # Train Station -> West Street
        (4, 12),  # Book Shop -> West Street
        (5, 12),  # Hospital -> West Street
        # North Street buildings (all connect to North Street Node)
        (6, 13),  # Sports Centre -> North Street
        (7, 13),  # Bank -> North Street
        (8, 13),  # Fire Station -> North Street
        # East Street buildings (all connect to East Street Node)
        (9, 14),  # Supermarket -> East Street
        (10, 14),  # Bakery -> East Street
        (11, 14),  # Clinic -> East Street
    ]

    for building, street in building_street_pairs:
        adj[building, street] = 1  # Building → Street
        adj[street, building] = 1  # Street → Building

    # Street node connections (compass relationships)
    # West Street (South to North): W7 -> W6 -> W5 -> W4 -> W3 -> W2 -> W1
    west_street_connections = [
        (12, 13),
        (13, 14),
        (14, 15),
        (15, 16),
        (16, 17),
        (17, 18),
    ]

    # North Street (West to East): N1 -> N2 -> N3 -> N4 -> N5
    north_street_connections = [(19, 20), (20, 21), (21, 22), (22, 23)]

    # East Street (North to South): E1 -> E2 -> E3 -> E4
    east_street_connections = [(24, 25), (25, 26), (26, 27)]

    # Junction connections
    junction_connections = [
        (18, 19),  # W1 (West/North intersection) -> N1
        (23, 24),  # N5 (North/East junction) -> E1
    ]

    # Apply all street connections (bidirectional)
    all_street_connections = (
        west_street_connections
        + north_street_connections
        + east_street_connections
        + junction_connections
    )

    for node1, node2 in all_street_connections:
        adj[node1, node2] = 1  # Forward connection
        adj[node2, node1] = (
            1  # Backward connection    # Building adjacencies based on navigation guide (neighbors)
        )
    # West Street - Left side (when walking north)
    adj[0, 1] = 1
    adj[1, 0] = 1  # Post Office ↔ Church
    adj[1, 2] = 1
    adj[2, 1] = 1  # Church ↔ Police Station

    # West Street - Right side (when walking north)
    adj[3, 4] = 1
    adj[4, 3] = 1  # Train Station ↔ Book Shop
    adj[4, 5] = 1
    adj[5, 4] = 1  # Book Shop ↔ Hospital

    # North Street (when walking east - all on left/south side)
    adj[6, 7] = 1
    adj[7, 6] = 1  # Sports Centre ↔ Bank
    adj[7, 8] = 1
    adj[8, 7] = 1  # Bank ↔ Fire Station

    # East Street (when walking south - all on left/west side)
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

    # T-shaped layout positions (rotated 90° clockwise as described)
    pos = {
        # West Street - Left side (west side when walking north)
        "Post Office": (2, 0),  # South end
        "Church": (2, 2),  # Middle
        "Police Station": (2, 4),  # North end
        # West Street - Right side (east side when walking north)
        "Train Station": (4, 0),  # South end
        "Book Shop": (4, 2),  # Middle
        "Hospital": (4, 4),  # North end
        # North Street (horizontal bar - all on south side when walking east)
        "Sports Centre": (0, 6),  # West end
        "Bank": (3, 6),  # Middle
        "Fire Station": (6, 6),  # East end
        # East Street (all on west side when walking south)
        "Supermarket": (8, 4),  # North end
        "Bakery": (8, 2),  # Middle
        "Clinic": (8, 0),  # South end
        # Street nodes (central to their streets)
        "West Street Node": (3, 2),  # Center of West Street
        "North Street Node": (3, 6),  # Center of North Street
        "East Street Node": (8, 2),  # Center of East Street
        # Junctions (where streets meet to form T-shape)
        "West/North Junction": (3, 5),  # Where West St meets North St
        "North/East Junction": (7, 6),  # Where North St meets East St
    }

    return G, pos


def render_map(G, pos, save_path=None):
    """Render the semantic map with buildings, streets, and intersections"""

    plt.figure(figsize=(16, 12))

    # Categorize nodes by type
    building_nodes = [n for n in G.nodes() if "St)" in n]
    street_nodes = [n for n in G.nodes() if "Street" in n and "Junction" not in n]
    junction_nodes = [n for n in G.nodes() if "Junction" in n]

    # Draw different node types with different colors and sizes
    if building_nodes:
        nx.draw_networkx_nodes(
            G,
            pos,
            nodelist=building_nodes,
            node_color="lightblue",
            node_size=2500,
            alpha=0.8,
            label="Buildings",
        )

    if street_nodes:
        nx.draw_networkx_nodes(
            G,
            pos,
            nodelist=street_nodes,
            node_color="lightgreen",
            node_size=1500,
            alpha=0.7,
            node_shape="s",
            label="Streets",
        )

    if junction_nodes:
        nx.draw_networkx_nodes(
            G,
            pos,
            nodelist=junction_nodes,
            node_color="orange",
            node_size=2000,
            alpha=0.8,
            node_shape="D",
            label="Junctions",
        )

    # Draw edges
    nx.draw_networkx_edges(G, pos, edge_color="gray", width=1.5, alpha=0.6)

    # Draw labels with smaller font for readability
    labels = {}
    for node in G.nodes():
        if "St)" in node:  # Buildings
            labels[node] = node.split(" (")[0]  # Remove street info for cleaner display
        else:
            labels[node] = node

    nx.draw_networkx_labels(
        G, pos, labels, font_size=7, font_weight="bold", font_family="sans-serif"
    )

    plt.title(
        "Semantic Map: Buildings, Streets & Intersections\nT-Shaped Street Layout with Explicit Routing",
        fontsize=14,
        fontweight="bold",
        pad=20,
    )

    # Add legend
    plt.legend(scatterpoints=1, loc="upper left", bbox_to_anchor=(0.02, 0.98))

    plt.axis("off")

    # Add detailed legend
    legend_text = """
    Node Types:
    • Blue circles: Buildings with street addresses
    • Green squares: Street segments  
    • Orange diamonds: Street intersections/junctions
    
    Connections:
    • Buildings ↔ Streets (enter/exit)
    • Streets ↔ Intersections (routing)
    • Within-street building adjacency
    """
    plt.text(
        -1.2,
        -0.5,
        legend_text,
        fontsize=9,
        verticalalignment="top",
        bbox=dict(boxstyle="round,pad=0.5", facecolor="lightyellow", alpha=0.8),
    )

    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches="tight")
        print(f"Map saved to: {save_path}")

    plt.show()


def find_shortest_path(G, start, end):
    """Find and display the shortest path between two buildings with navigation instructions"""

    if nx.has_path(G, start, end):
        path = nx.shortest_path(G, source=start, target=end)
        path_length = nx.shortest_path_length(G, source=start, target=end)

        print(f"\nShortest path from '{start}' to '{end}':")
        print(f"Route: {' → '.join(path)}")
        print(f"Number of steps: {path_length}")

        # Provide detailed navigation instructions
        nav_instructions = provide_navigation_instructions(start, end, path)
        print(nav_instructions)

        return path
    else:
        print(
            f"\nNo valid path from '{start}' to '{end}' due to directional constraints."
        )
        return None


def provide_navigation_instructions(start, end, path):
    """Provide detailed navigation instructions based on the map layout"""
    if not path:
        return "No route available."

    instructions = []
    instructions.append(f"\n🧭 NAVIGATION FROM {start.upper()} TO {end.upper()}:")
    instructions.append("=" * 60)

    # Building exit instructions
    if start in ["Post Office", "Church", "Police Station"]:
        instructions.append(f"1. Exit {start} heading EAST to West Street")
    elif start in ["Train Station", "Book Shop", "Hospital"]:
        instructions.append(f"1. Exit {start} heading WEST to West Street")
    elif start in ["Sports Centre", "Bank", "Fire Station"]:
        instructions.append(f"1. Exit {start} heading SOUTH to North Street")
    elif start in ["Supermarket", "Bakery", "Clinic"]:
        instructions.append(f"1. Exit {start} heading WEST to East Street")

    # Provide step-by-step directions based on path
    step = 2
    for i in range(len(path) - 1):
        current = path[i]
        next_node = path[i + 1]

        if "Junction" in current and "Junction" in next_node:
            instructions.append(
                f"{step}. Walk EAST along North Street from West/North Junction to North/East Junction"
            )
            step += 1
        elif current == "West Street Node" and next_node == "West/North Junction":
            instructions.append(
                f"{step}. Walk NORTH on West Street to the junction with North Street"
            )
            step += 1
        elif current == "North Street Node" and next_node == "West/North Junction":
            instructions.append(
                f"{step}. Walk WEST on North Street to the junction with West Street"
            )
            step += 1
        elif current == "North Street Node" and next_node == "North/East Junction":
            instructions.append(
                f"{step}. Walk EAST on North Street to the junction with East Street"
            )
            step += 1

    # Building entrance instructions
    if end in ["Post Office", "Church", "Police Station"]:
        instructions.append(
            f"{step}. Enter {end} from West Street (entrance faces EAST)"
        )
    elif end in ["Train Station", "Book Shop", "Hospital"]:
        instructions.append(
            f"{step}. Enter {end} from West Street (entrance faces WEST)"
        )
    elif end in ["Sports Centre", "Bank", "Fire Station"]:
        instructions.append(
            f"{step}. Enter {end} from North Street (entrance faces SOUTH)"
        )
    elif end in ["Supermarket", "Bakery", "Clinic"]:
        instructions.append(
            f"{step}. Enter {end} from East Street (entrance faces WEST)"
        )

    return "\n".join(instructions)


def analyze_graph(G):
    """Analyze the graph structure and provide statistics"""

    print("Graph Analysis:")
    print(f"Number of nodes: {G.number_of_nodes()}")
    print(f"Number of connections (edges): {G.number_of_edges()}")
    print(f"Graph type: {'Directed' if G.is_directed() else 'Undirected'}")

    # Count different node types
    building_nodes = [n for n in G.nodes() if "St)" in n]
    street_nodes = [n for n in G.nodes() if "Street" in n and "Junction" not in n]
    junction_nodes = [n for n in G.nodes() if "Junction" in n]

    print(f"Buildings: {len(building_nodes)}")
    print(f"Streets: {len(street_nodes)}")
    print(f"Junctions: {len(junction_nodes)}")

    # Find nodes with lowest degree (least connected)
    min_degree = min(dict(G.degree()).values())
    least_connected = [node for node, degree in G.degree() if degree == min_degree]
    if least_connected:
        print(
            f"Least connected nodes (degree {min_degree}): {', '.join(least_connected[:3])}{'...' if len(least_connected) > 3 else ''}"
        )

    print()


def main():
    """Main function to create and render the semantic map with streets and intersections"""

    print("Creating semantic map with buildings, streets, and intersections...")
    print("Based on T-shaped street layout with explicit routing nodes...")

    # Create the graph and positions
    G, pos = create_directed_map()

    # Analyze the graph
    analyze_graph(G)

    # Render the map
    render_map(G, pos, save_path="semantic_map.png")

    # Example path finding
    print("=" * 50)
    print("EXAMPLE ROUTE PLANNING:")
    print("=" * 50)

    # Test various paths including all buildings from the navigation guide
    test_routes = [
        ("Post Office", "Clinic"),  # West to East Street
        ("Train Station", "Fire Station"),  # West to North Street
        ("Hospital", "Supermarket"),  # West to East Street
        ("Sports Centre", "Bakery"),  # North to East Street
        ("Police Station", "Bank"),  # West to North Street
        ("Church", "Sports Centre"),  # West to North Street
        ("West Street Node", "East Street Node"),  # Street to street
        ("West/North Junction", "North/East Junction"),  # Junction to junction
    ]

    for start, end in test_routes:
        find_shortest_path(G, start, end)

    print("\n" + "=" * 50)
    print("Map rendering complete! Check the displayed plot and saved PNG file.")


if __name__ == "__main__":
    main()
