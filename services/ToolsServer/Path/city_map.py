"""
City Map Navigation System

A comprehensive city map visualization and navigation system featuring:
- W1-W5 logical street layout (North to South)
- Direct street connections (W2-N1, N2-E1)
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
    Create the city map with logical W1-W5 layout with bidirectional edges and directional labels.

    Returns:
        NetworkX.DiGraph: Complete city map graph with directional edges
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
        # West Street (12-16): W1 (North) → W2 → W3 → W4 → W5 (South)
        "W1",
        "W2",
        "W3",
        "W4",
        "W5",
        # North Street (17-19): N1 (West) → N2 → N3 (East)
        "N1",
        "N2",
        "N3",
        # East Street (20-22): E1 (North) → E2 → E3 (South)
        "E1",
        "E2",
        "E3",
    ]

    # Create directed graph with edge labels
    G = nx.DiGraph()
    
    # Add all nodes
    G.add_nodes_from(node_names)
    
    # Helper function to add bidirectional edges with labels
    def add_bidirectional_edge(from_node, to_node, from_to_direction, to_from_direction):
        G.add_edge(from_node, to_node, direction=from_to_direction)
        G.add_edge(to_node, from_node, direction=to_from_direction)
    
    # Building-to-street connections (bidirectional with appropriate directions)
    # West Street buildings
    add_bidirectional_edge("Post Office", "W5", "East", "West")
    add_bidirectional_edge("Train Station", "W5", "West", "East")
    add_bidirectional_edge("Book Shop", "W4", "West", "East")
    add_bidirectional_edge("Hospital", "W3", "West", "East")
    add_bidirectional_edge("Church", "W3", "East", "West")
    add_bidirectional_edge("Police Station", "W1", "East", "West")
    
    # North Street buildings
    add_bidirectional_edge("Sports Centre", "N1", "South", "North")
    add_bidirectional_edge("Bank", "N2", "North", "South")
    add_bidirectional_edge("Fire Station", "N3", "North", "South")
    
    # East Street buildings
    add_bidirectional_edge("Supermarket", "E1", "East", "West")
    add_bidirectional_edge("Bakery", "E2", "East", "West")
    add_bidirectional_edge("Clinic", "E3", "East", "West")
    
    # Street connections with proper directional labels
    # West Street: W1 (North) ↔ W2 ↔ W3 ↔ W4 ↔ W5 (South)
    add_bidirectional_edge("W1", "W2", "South", "North")
    add_bidirectional_edge("W2", "W3", "South", "North")
    add_bidirectional_edge("W3", "W4", "South", "North")
    add_bidirectional_edge("W4", "W5", "South", "North")
    
    # North Street: N1 (West) ↔ N2 ↔ N3 (East)
    add_bidirectional_edge("N1", "N2", "East", "West")
    add_bidirectional_edge("N2", "N3", "East", "West")
    
    # East Street: E1 (North) ↔ E2 ↔ E3 (South)
    add_bidirectional_edge("E1", "E2", "South", "North")
    add_bidirectional_edge("E2", "E3", "South", "North")
    
    # Inter-street connections
    add_bidirectional_edge("W2", "N1", "East", "West")
    add_bidirectional_edge("N2", "E1", "South", "North")
    
    # Building-to-building adjacencies (same location or adjacent blocks)
    # Same node connections
    add_bidirectional_edge("Post Office", "Train Station", "East", "West")
    add_bidirectional_edge("Hospital", "Church", "West", "East")
    
    # West Street building chains
    add_bidirectional_edge("Post Office", "Church", "North", "South")
    add_bidirectional_edge("Church", "Police Station", "North", "South")
    add_bidirectional_edge("Train Station", "Book Shop", "North", "South")
    add_bidirectional_edge("Book Shop", "Hospital", "North", "South")
    
    # North Street building chain
    add_bidirectional_edge("Sports Centre", "Bank", "East", "West")
    add_bidirectional_edge("Bank", "Fire Station", "East", "West")
    
    # East Street building chain
    add_bidirectional_edge("Supermarket", "Bakery", "South", "North")
    add_bidirectional_edge("Bakery", "Clinic", "South", "North")
    
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
        # Street nodes
        "W1": (3, 12),
        "W2": (3, 10),
        "W3": (3, 8),
        "W4": (3, 6),
        "W5": (3, 4),
        "N1": (7, 10),
        "N2": (9, 10),
        "N3": (11, 10),
        "E1": (9, 8),
        "E2": (9, 6),
        "E3": (9, 4),
    }


def render_map(G, positions):
    """
    Render the city map visualization with directional edge labels.

    Args:
        G (NetworkX.DiGraph): City map directed graph
        positions (dict): Node position coordinates

    Returns:
        dict: Position dictionary for further use
    """
    plt.figure(figsize=(20, 14))

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

    # Draw graph nodes
    nx.draw_networkx_nodes(
        G, positions, node_color=node_colors, node_size=2000, alpha=0.9
    )
    nx.draw_networkx_labels(G, positions, font_size=8, font_weight="bold")
    
    # Draw edges (convert to undirected for cleaner visualization)
    undirected_G = G.to_undirected()
    nx.draw_networkx_edges(undirected_G, positions, edge_color="gray", width=2, alpha=0.7)
    
    # Draw edge labels with directions
    edge_labels = {}
    processed_edges = set()
    
    for edge in G.edges(data=True):
        from_node, to_node, data = edge
        # Avoid duplicate labels for bidirectional edges
        if (to_node, from_node) not in processed_edges:
            direction1 = data.get('direction', '')
            # Get reverse direction
            reverse_data = G.get_edge_data(to_node, from_node)
            direction2 = reverse_data.get('direction', '') if reverse_data else ''
            
            if direction1 and direction2:
                edge_labels[(from_node, to_node)] = f"{direction1}\n{direction2}"
            processed_edges.add((from_node, to_node))
    
    # Draw edge labels
    nx.draw_networkx_edge_labels(
        undirected_G, positions, edge_labels, font_size=6, 
        bbox=dict(boxstyle="round,pad=0.1", facecolor="white", alpha=0.7)
    )

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
        "City Map - W1-W5 Bidirectional Layout with Directional Labels\nPolice Station-W1, Church-W3-Hospital, W4-BookShop, PostOffice-W5-TrainStation",
        fontsize=14,
        fontweight="bold",
        pad=20,
    )
    plt.axis("off")
    plt.tight_layout()
    plt.savefig("city_map_bidirectional.png", dpi=300, bbox_inches="tight")
    plt.show()

    return positions


def find_path(G, start, end):
    """Find shortest path between two locations using undirected version of the graph."""
    try:
        # Convert to undirected for pathfinding since we have bidirectional edges
        undirected_G = G.to_undirected()
        return nx.astar_path(undirected_G, start, end)
    except nx.NetworkXNoPath:
        return None


def generate_navigation_instructions(G, start, end, positions):
    """
    Generate step-by-step navigation instructions with directional edge labels.

    Args:
        G (NetworkX.DiGraph): City map directed graph with edge labels
        start (str): Starting location
        end (str): Destination location
        positions (dict): Node positions

    Returns:
        str: Formatted navigation instructions with directional information
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

    # Generate path instructions using edge direction labels
    for i in range(len(path) - 1):
        current = path[i]
        next_node = path[i + 1]
        
        # Get direction from edge data
        edge_data = G.get_edge_data(current, next_node)
        if edge_data and 'direction' in edge_data:
            direction = edge_data['direction']
            
            # Determine street context
            if current.startswith("W") and next_node.startswith("W"):
                street_name = "West Street"
            elif current.startswith("N") and next_node.startswith("N"):
                street_name = "North Street"
            elif current.startswith("E") and next_node.startswith("E"):
                street_name = "East Street"
            elif (current.startswith("W") and next_node.startswith("N")) or \
                 (current.startswith("N") and next_node.startswith("W")):
                street_name = "to connecting street"
            elif (current.startswith("N") and next_node.startswith("E")) or \
                 (current.startswith("E") and next_node.startswith("N")):
                street_name = "to connecting street"
            else:
                street_name = "street"
            
            instructions.append(
                f"{step}. Go {direction.upper()} from {current} to {next_node} on {street_name}"
            )
        else:
            # Fallback for building connections or missing edge data
            instructions.append(
                f"{step}. Move from {current} to {next_node}"
            )
        
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
            "✅ BIDIRECTIONAL LAYOUT SUMMARY:",
            "• Police Station at W1 (northernmost)",
            "• W2 connects directly to N1 (West/North Streets)",
            "• N2 connects directly to E1 (North/East Streets)",
            "• Church (WEST) and Hospital (EAST) at W3",
            "• Book Shop at W4 (EAST side)",
            "• Post Office (WEST) and Train Station (EAST) at W5",
            "• All edges are bidirectional with compass directions",
            "• W5→W4: North, W4→W5: South (example)",
        ]
    )

    return "\n".join(instructions)


def analyze_map(G):
    """Analyze and display map statistics for directed graph with edge labels."""
    print("🔍 CITY MAP ANALYSIS (Bidirectional with Edge Labels)")
    print("=" * 60)
    print(f"Total nodes: {len(G.nodes())}")
    print(f"Total directed edges: {len(G.edges())}")
    
    # Check connectivity using undirected version
    undirected_G = G.to_undirected()
    print(f"Graph is connected: {nx.is_connected(undirected_G)}")

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
    
    print(f"Buildings: {len(buildings)}")
    print(f"Street nodes: {len(streets)}")
    
    # Sample edge directions
    print("\n📍 Sample Edge Directions:")
    sample_edges = [("W5", "W4"), ("W4", "W5"), ("N1", "N2"), ("N2", "N1")]
    for from_node, to_node in sample_edges:
        if G.has_edge(from_node, to_node):
            direction = G.get_edge_data(from_node, to_node).get('direction', 'Unknown')
            print(f"  {from_node} → {to_node}: {direction}")


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
