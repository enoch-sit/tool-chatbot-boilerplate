import networkx as nx
import numpy as np
import matplotlib.pyplot as plt


def create_directed_map():
    """Create semantic map with buildings, streets, and intersections"""

    # Node names as per the updated guide
    node_names = [
        "Police Station (West St)",  # 0
        "Church (West St)",  # 1
        "Post Office (West St)",  # 2
        "Hospital (West St)",  # 3
        "Book Shop (West St)",  # 4
        "Train Station (West St)",  # 5
        "Sports Centre (North St)",  # 6
        "Bank (North St)",  # 7
        "Fire Station (North St)",  # 8
        "Supermarket (East St)",  # 9
        "Bakery (East St)",  # 10
        "Clinic (East St)",  # 11
        "West Street",  # 12
        "North Street",  # 13
        "East Street",  # 14
        "West/North Junction",  # 15
        "North/East Junction",  # 16
    ]

    # Create adjacency matrix for 17 nodes
    N = 17  # 12 buildings + 3 streets + 2 intersections
    adj = np.zeros((N, N), dtype=int)

    # Buildings <-> Streets (bidirectional)
    # West Street Buildings
    building_street_pairs = [
        # (building_idx, street_idx)
        (0, 12),
        (1, 12),
        (2, 12),
        (3, 12),
        (4, 12),
        (5, 12),  # West Street buildings
        (6, 13),
        (7, 13),
        (8, 13),  # North Street buildings
        (9, 14),
        (10, 14),
        (11, 14),  # East Street buildings
    ]

    for building, street in building_street_pairs:
        adj[building, street] = 1  # Building → Street
        adj[street, building] = 1  # Street → Building

    # Streets <-> Intersections (bidirectional)
    street_intersection_pairs = [
        (12, 15),  # West Street ↔ West/North Junction
        (13, 15),  # North Street ↔ West/North Junction
        (13, 16),  # North Street ↔ North/East Junction
        (14, 16),  # East Street ↔ North/East Junction
    ]

    for street, intersection in street_intersection_pairs:
        adj[street, intersection] = 1  # Street → Intersection
        adj[intersection, street] = 1  # Intersection → Street

    # Intersections <-> Intersections (via North Street)
    adj[15, 16] = 1  # West/North → North/East via North Street
    adj[16, 15] = 1  # North/East → West/North via North Street

    # Within-street adjacency for buildings (walkable connections)
    # West Street adjacency (north-south)
    adj[0, 1] = 1
    adj[1, 0] = 1  # Police Station ↔ Church
    adj[1, 2] = 1
    adj[2, 1] = 1  # Church ↔ Post Office
    adj[3, 4] = 1
    adj[4, 3] = 1  # Hospital ↔ Book Shop
    adj[4, 5] = 1
    adj[5, 4] = 1  # Book Shop ↔ Train Station

    # North Street adjacency (west-east)
    adj[6, 7] = 1
    adj[7, 6] = 1  # Sports Centre ↔ Bank
    adj[7, 8] = 1
    adj[8, 7] = 1  # Bank ↔ Fire Station

    # East Street adjacency (north-south)
    adj[9, 10] = 1
    adj[10, 9] = 1  # Supermarket ↔ Bakery
    adj[10, 11] = 1
    adj[11, 10] = 1  # Bakery ↔ Clinic

    # Junction connections to buildings at street ends
    adj[0, 15] = 1
    adj[15, 0] = 1  # Police Station ↔ West/North Junction
    adj[9, 16] = 1
    adj[16, 9] = 1  # Supermarket ↔ North/East Junction

    # Build graph from adjacency matrix
    G = nx.from_numpy_array(adj, create_using=nx.Graph())

    # Relabel nodes with meaningful names
    mapping = {i: node_names[i] for i in range(len(node_names))}
    G = nx.relabel_nodes(G, mapping)

    # Add edge attributes for semantic meaning
    for u, v in G.edges():
        G[u][v]["type"] = f"connection_{u}_to_{v}"
        G[u][v]["weight"] = 1  # Equal weight for all connections

    # Define positions for T-layout visualization with streets and intersections
    pos = {
        # West Street buildings (south to north on left side)
        "Post Office (West St)": (0, 0),
        "Church (West St)": (0, 1),
        "Police Station (West St)": (0, 2.5),
        # West Street buildings (south to north on right side)
        "Train Station (West St)": (1, 0),
        "Book Shop (West St)": (1, 1),
        "Hospital (West St)": (1, 2),
        # North Street buildings (west to east)
        "Sports Centre (North St)": (1.5, 3.5),
        "Bank (North St)": (2.5, 3.5),
        "Fire Station (North St)": (3.5, 3.5),
        # East Street buildings (north to south)
        "Supermarket (East St)": (4.5, 2.5),
        "Bakery (East St)": (4.5, 1),
        "Clinic (East St)": (4.5, 0),
        # Street segments (virtual nodes)
        "West Street": (0.5, 1.5),
        "North Street": (2.5, 3),
        "East Street": (4.5, 1.5),
        # Intersections
        "West/North Junction": (1.5, 2.8),
        "North/East Junction": (3.5, 2.8),
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
    """Find and display the shortest path between two buildings"""

    if nx.has_path(G, start, end):
        path = nx.shortest_path(G, source=start, target=end)
        path_length = nx.shortest_path_length(G, source=start, target=end)

        print(f"\nShortest path from '{start}' to '{end}':")
        print(f"Route: {' → '.join(path)}")
        print(f"Number of steps: {path_length}")
        return path
    else:
        print(
            f"\nNo valid path from '{start}' to '{end}' due to directional constraints."
        )
        return None


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

    # Test various paths with new node names
    test_routes = [
        ("Post Office (West St)", "Clinic (East St)"),
        ("Train Station (West St)", "Fire Station (North St)"),
        ("Hospital (West St)", "Bakery (East St)"),
        ("Sports Centre (North St)", "Book Shop (West St)"),
        ("West Street", "East Street"),  # Street to street routing
        ("West/North Junction", "North/East Junction"),  # Junction to junction
    ]

    for start, end in test_routes:
        find_shortest_path(G, start, end)

    print("\n" + "=" * 50)
    print("Map rendering complete! Check the displayed plot and saved PNG file.")


if __name__ == "__main__":
    main()
