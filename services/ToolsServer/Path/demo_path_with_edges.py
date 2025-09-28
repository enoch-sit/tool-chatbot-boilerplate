"""
Quick example showing the find_path_with_edges function
"""

from city_map import create_city_map, find_path_with_edges


def demo_path_with_edges():
    """Demonstrate the find_path_with_edges function"""

    # Create the city map
    G = create_city_map()

    # Test different routes
    test_routes = [
        ("Police Station", "Train Station"),
        ("Sports Centre", "Bakery"),
        ("Church", "Hospital"),
    ]

    print("🔍 FIND_PATH_WITH_EDGES FUNCTION DEMO")
    print("=" * 50)

    for start, end in test_routes:
        print(f"\n📍 Route: {start} → {end}")
        print("-" * 40)

        # This is the function you're looking for!
        path_nodes, path_edges = find_path_with_edges(G, start, end)

        if path_nodes and path_edges:
            print(f"NODES: {path_nodes}")
            print(f"EDGES:")
            for edge in path_edges:
                print(f"  {edge['from']} → {edge['to']} : {edge['direction']}")
        else:
            print("No path found!")


if __name__ == "__main__":
    demo_path_with_edges()
