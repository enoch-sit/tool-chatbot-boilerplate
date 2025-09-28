"""
Simple Path with Edges Function

Just the essentials: input start/end locations, output path with all nodes and edges.
"""

from city_map import create_city_map, find_path_with_edges


def get_path_with_edges(start, end):
    """
    Simple function to get path with edges between two locations.

    Args:
        start (str): Starting location
        end (str): Destination location

    Returns:
        tuple: (path_nodes, path_edges) or (None, None) if no path
    """
    # Create city map
    G = create_city_map()

    # Find path with edges
    path, edges = find_path_with_edges(G, start, end)

    return path, edges


def print_path_details(start, end):
    """
    Print path details in a clean format.

    Args:
        start (str): Starting location
        end (str): Destination location
    """
    path, edges = get_path_with_edges(start, end)

    if not path:
        print(f"No path found from {start} to {end}")
        return

    print(f"Route: {start} → {end}")
    print(f"Path: {' → '.join(path)}")
    print("Edges:")
    for edge in edges:
        print(f"  {edge['from']} → {edge['to']} : {edge['direction']}")


# Test the function
if __name__ == "__main__":
    print("🗺️ SIMPLE PATH WITH EDGES TEST")
    print("=" * 40)

    # Test cases
    test_routes = [
        ("Police Station", "W2"),  # Building to street node
        ("W2", "N1"),  # Street node to street node
        ("N1", "W1"),  # Reverse direction
        ("Church", "Hospital"),  # Adjacent buildings
        ("Sports Centre", "E3"),  # Cross-city with all street nodes
    ]

    for start, end in test_routes:
        print(f"\n{start} → {end}:")
        print("-" * 30)
        print_path_details(start, end)
