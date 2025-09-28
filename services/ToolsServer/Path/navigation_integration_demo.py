"""
Integration Example: Step-by-Step Directions with City Map

This example shows how to integrate the step_by_step_directions module
with the city map pathfinding system for complete navigation functionality.
"""

from city_map import create_city_map, find_path_with_edges
from step_by_step_directions import create_step_by_step_directions


def get_complete_navigation(start: str, end: str, format_type: str = "string"):
    """
    Complete navigation function that combines pathfinding with step-by-step directions.

    Args:
        start: Starting location name
        end: Destination location name
        format_type: Output format ('string', 'list', 'steps', 'analysis')

    Returns:
        Navigation instructions in the requested format
    """
    # Create city map and direction handler
    city_map = create_city_map()
    direction_handler = create_step_by_step_directions()

    # Find path with edge information
    path, path_edges = find_path_with_edges(city_map, start, end)

    # Generate step-by-step directions
    return direction_handler.generate_navigation_from_path_edges(
        start, end, path, path_edges, format_type
    )


def demo_complete_navigation():
    """Demonstrate complete navigation with various routes and formats"""
    print("🗺️ COMPLETE NAVIGATION SYSTEM DEMO")
    print("=" * 60)

    # Test routes with different characteristics
    test_routes = [
        ("Police Station", "Train Station"),  # Simple route
        ("Sports Centre", "Clinic"),  # Cross-city route
        ("Church", "Hospital"),  # Adjacent buildings
        ("Bank", "Supermarket"),  # Inter-street connection
    ]

    for i, (start, end) in enumerate(test_routes, 1):
        print(f"\n{i}. ROUTE: {start} → {end}")
        print("-" * 50)

        # Get navigation instructions
        instructions = get_complete_navigation(start, end, "string")
        print(instructions)

        # Get analysis for this route
        analysis = get_complete_navigation(start, end, "analysis")
        if analysis:
            print(f"\n   📊 ROUTE ANALYSIS:")
            print(f"      • Steps: {analysis['total_steps']}")
            print(f"      • Direction changes: {analysis['direction_changes']}")
            print(f"      • Directions used: {', '.join(analysis['directions_used'])}")
            print(f"      • Streets traversed: {', '.join(analysis['streets_used'])}")


def interactive_navigation():
    """Interactive navigation system for user input"""
    print("\n🧭 INTERACTIVE NAVIGATION SYSTEM")
    print("=" * 50)

    # Available locations
    buildings = [
        "Police Station",
        "Church",
        "Hospital",
        "Book Shop",
        "Post Office",
        "Train Station",
        "Sports Centre",
        "Bank",
        "Fire Station",
        "Supermarket",
        "Bakery",
        "Clinic",
    ]

    street_nodes = ["W1", "W2", "W3", "W4", "W5", "N1", "N2", "N3", "E1", "E2", "E3"]

    print("Available Buildings:")
    for i, building in enumerate(buildings, 1):
        print(f"   {i:2d}. {building}")

    print(f"\nAvailable Street Nodes: {', '.join(street_nodes)}")
    print("\nType 'exit' to quit")

    while True:
        try:
            print("\n" + "=" * 40)
            start = input("Enter starting location: ").strip()
            if start.lower() == "exit":
                break

            end = input("Enter destination: ").strip()
            if end.lower() == "exit":
                break

            # Get navigation
            print(f"\n🗺️ Finding route from {start} to {end}...")
            instructions = get_complete_navigation(start, end, "string")
            print(instructions)

        except KeyboardInterrupt:
            print("\n\nGoodbye! 👋")
            break
        except Exception as e:
            print(f"❌ Error: {e}")
            print("Please check location names and try again.")


def test_all_formats():
    """Test all output formats for a single route"""
    print("\n📋 ALL OUTPUT FORMATS TEST")
    print("=" * 50)

    start, end = "Police Station", "Bakery"

    formats = ["string", "list", "steps", "analysis"]

    for format_type in formats:
        print(f"\n{format_type.upper()} FORMAT:")
        print("-" * 30)

        result = get_complete_navigation(start, end, format_type)

        if format_type == "string":
            print(result)
        elif format_type == "list":
            for instruction in result:
                print(f"   {instruction}")
        elif format_type == "steps":
            print(f"   Navigation Steps ({len(result)} total):")
            for step in result:
                print(
                    f"   {step.step_number}. {step.instruction_type.upper()}: {step.details}"
                )
        elif format_type == "analysis":
            for key, value in result.items():
                print(f"   {key}: {value}")


def benchmark_navigation_system():
    """Benchmark the navigation system performance"""
    import time

    print("\n⚡ PERFORMANCE BENCHMARK")
    print("=" * 50)

    # Test routes
    test_routes = [
        ("Police Station", "Train Station"),
        ("Sports Centre", "Clinic"),
        ("Church", "Supermarket"),
        ("Bank", "Post Office"),
        ("Fire Station", "Book Shop"),
    ]

    total_time = 0
    successful_routes = 0

    for start, end in test_routes:
        start_time = time.time()

        try:
            instructions = get_complete_navigation(start, end, "string")
            end_time = time.time()

            if "No path found" not in instructions:
                successful_routes += 1
                route_time = (end_time - start_time) * 1000  # Convert to milliseconds
                total_time += route_time

                print(f"   {start} → {end}: {route_time:.2f}ms ✅")
            else:
                print(f"   {start} → {end}: No path found ❌")

        except Exception as e:
            print(f"   {start} → {end}: Error - {e} ❌")

    if successful_routes > 0:
        avg_time = total_time / successful_routes
        print(f"\n📊 BENCHMARK RESULTS:")
        print(f"   • Successful routes: {successful_routes}/{len(test_routes)}")
        print(f"   • Average time per route: {avg_time:.2f}ms")
        print(f"   • Total processing time: {total_time:.2f}ms")


def main():
    """Main demonstration function"""
    try:
        # Run all demonstrations
        demo_complete_navigation()
        test_all_formats()
        benchmark_navigation_system()

        # Uncomment to run interactive mode
        # interactive_navigation()

        print("\n" + "=" * 60)
        print("✅ STEP-BY-STEP DIRECTIONS INTEGRATION COMPLETE!")
        print("=" * 60)
        print("\n💡 Usage Tips:")
        print("   • Use get_complete_navigation() for one-line navigation")
        print("   • Choose format_type based on your needs:")
        print("     - 'string': Full formatted instructions")
        print("     - 'list': Simple instruction list")
        print("     - 'steps': NavigationStep objects for custom processing")
        print("     - 'analysis': Detailed route statistics")

    except Exception as e:
        print(f"❌ Demo failed: {e}")


if __name__ == "__main__":
    main()
