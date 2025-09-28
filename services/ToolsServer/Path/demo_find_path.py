"""
City Map Find Path Functions - Demo Script

This script demonstrates how to use the find_path and find_path_with_edges functions
with practical examples and error handling.
"""

from city_map import create_city_map, find_path, find_path_with_edges


def demo_basic_pathfinding():
    """Demonstrate basic pathfinding functionality"""
    print("=" * 60)
    print("🗺️  BASIC PATHFINDING DEMO")
    print("=" * 60)

    # Create the city map
    G = create_city_map()

    # Example 1: Building to building
    print("\n1. Building to Building Navigation:")
    path = find_path(G, "Police Station", "Train Station")
    if path:
        print(f"   Route: {' → '.join(path)}")
        print(f"   Steps: {len(path) - 1}")

    # Example 2: Building to street node
    print("\n2. Building to Street Node:")
    path = find_path(G, "Sports Centre", "E1")
    if path:
        print(f"   Route: {' → '.join(path)}")
        print(f"   Steps: {len(path) - 1}")

    # Example 3: Cross-city navigation
    print("\n3. Cross-City Navigation:")
    path = find_path(G, "Police Station", "Clinic")
    if path:
        print(f"   Route: {' → '.join(path)}")
        print(f"   Steps: {len(path) - 1}")


def demo_detailed_pathfinding():
    """Demonstrate pathfinding with edge information"""
    print("\n" + "=" * 60)
    print("🧭  DETAILED PATHFINDING WITH DIRECTIONS DEMO")
    print("=" * 60)

    G = create_city_map()

    # Example: Church to Bakery with directions
    print("\n📍 Route: Church → Bakery")
    path, edges = find_path_with_edges(G, "Church", "Bakery")

    if path and edges:
        print(f"   Path: {' → '.join(path)}")
        print(f"   Total Steps: {len(edges)}")
        print("\n   Step-by-Step Directions:")

        for i, edge in enumerate(edges, 1):
            direction = edge["direction"]
            from_node = edge["from"]
            to_node = edge["to"]
            print(f"   {i}. Go {direction.upper()} from {from_node} to {to_node}")


def demo_error_handling():
    """Demonstrate error handling for invalid inputs"""
    print("\n" + "=" * 60)
    print("🚨  ERROR HANDLING DEMO")
    print("=" * 60)

    G = create_city_map()

    # Test invalid location
    print("\n1. Invalid Location Test:")
    path = find_path(G, "Police Station", "InvalidLocation")
    if path is None:
        print("   ✅ Correctly handled: No path found for invalid location")

    # Test disconnected nodes (shouldn't happen in our map)
    print("\n2. Path Existence Check:")
    path = find_path(G, "Police Station", "Bakery")
    if path:
        print(f"   ✅ Path exists: {len(path) - 1} steps")
    else:
        print("   ❌ No path found")


def demo_practical_use_cases():
    """Demonstrate practical use cases"""
    print("\n" + "=" * 60)
    print("🎯  PRACTICAL USE CASES DEMO")
    print("=" * 60)

    G = create_city_map()

    # Use Case 1: Find nearest emergency service
    print("\n1. Find Nearest Emergency Service:")
    start = "Sports Centre"
    emergency_services = ["Police Station", "Fire Station", "Hospital"]

    shortest_path = None
    shortest_distance = float("inf")

    for service in emergency_services:
        path = find_path(G, start, service)
        if path and len(path) < shortest_distance:
            shortest_path = path
            shortest_distance = len(path)

    if shortest_path:
        print(f"   From {start}:")
        print(f"   Nearest: {shortest_path[-1]} ({shortest_distance - 1} steps)")
        print(f"   Route: {' → '.join(shortest_path)}")

    # Use Case 2: Check reachability
    print("\n2. Location Reachability Check:")
    locations_to_check = ["Train Station", "Clinic", "Bank"]
    start = "Post Office"

    print(f"   From {start}, you can reach:")
    for location in locations_to_check:
        path = find_path(G, start, location)
        status = "✅ Yes" if path else "❌ No"
        steps = f"({len(path) - 1} steps)" if path else ""
        print(f"   - {location}: {status} {steps}")


def demo_path_analysis():
    """Demonstrate path analysis capabilities"""
    print("\n" + "=" * 60)
    print("📊  PATH ANALYSIS DEMO")
    print("=" * 60)

    G = create_city_map()

    # Analyze different routes
    routes = [
        ("Police Station", "Train Station"),
        ("Sports Centre", "Clinic"),
        ("Church", "Fire Station"),
        ("Book Shop", "Supermarket"),
    ]

    print("\n   Route Analysis:")
    print("   " + "-" * 50)

    for start, end in routes:
        path, edges = find_path_with_edges(G, start, end)
        if path:
            # Count direction changes
            directions = [edge["direction"] for edge in edges]
            direction_changes = sum(
                1
                for i in range(1, len(directions))
                if directions[i] != directions[i - 1]
            )

            print(f"   {start} → {end}:")
            print(f"     Steps: {len(path) - 1}")
            print(f"     Direction changes: {direction_changes}")
            print(f"     Directions used: {', '.join(set(directions))}")
            print()


def main():
    """Run all demonstration functions"""
    print("🏙️  CITY MAP PATHFINDING DEMONSTRATION")
    print("=====================================")

    try:
        demo_basic_pathfinding()
        demo_detailed_pathfinding()
        demo_error_handling()
        demo_practical_use_cases()
        demo_path_analysis()

        print("\n" + "=" * 60)
        print("✅  DEMO COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print("\n💡 Tips:")
        print("   - Use find_path() for simple routing")
        print("   - Use find_path_with_edges() for navigation instructions")
        print("   - Always check for None returns")
        print("   - All building and street node names are case-sensitive")

    except Exception as e:
        print(f"\n❌ Demo failed with error: {e}")
        print("   Make sure city_map.py is in the same directory")


if __name__ == "__main__":
    main()
