"""
FacingState Class Usage Examples

Shows how to use the FacingState class constructor and methods.
"""

from minimal_path_function import FacingState, get_path_and_edges


def demo_facing_state_constructor():
    """Demonstrate different ways to construct FacingState objects."""

    print("🧭 FACINGSTATE CONSTRUCTOR EXAMPLES")
    print("=" * 50)

    # 1. Default constructor (no direction)
    facing1 = FacingState()
    print(f"1. Default: {facing1}")

    # 2. Constructor with initial direction
    facing2 = FacingState(FacingState.NORTH)
    print(f"2. Start North: {facing2}")

    # 3. Constructor with string direction
    facing3 = FacingState("South")
    print(f"3. Start South: {facing3}")

    # 4. Using constants
    facing4 = FacingState(FacingState.EAST)
    print(f"4. Start East: {facing4}")


def demo_direction_methods():
    """Demonstrate FacingState direction methods."""

    print("\n🔄 DIRECTION METHODS DEMO")
    print("=" * 50)

    # Create facing state
    navigator = FacingState(FacingState.NORTH)
    print(f"Starting: {navigator}")

    # Test direction changes
    directions = [
        FacingState.EAST,
        FacingState.SOUTH,
        FacingState.WEST,
        FacingState.NORTH,
    ]

    for new_dir in directions:
        turn_needed = navigator.turn_to_direction(new_dir)
        print(f"To face {new_dir}: turn {turn_needed}")

        navigator.set_direction(new_dir)
        print(f"  Now facing: {navigator.get_direction()}")
        print(f"  Opposite: {navigator.get_opposite_direction()}")
        print()


def demo_navigation_with_facing():
    """Demonstrate using FacingState during navigation."""

    print("🗺️ NAVIGATION WITH FACING STATE")
    print("=" * 50)

    # Get a path
    path, edges = get_path_and_edges("Church", "Fire Station")

    if not path:
        print("No path found!")
        return

    print(f"Route: {' → '.join(path)}")
    print(f"Total steps: {len(edges)}")
    print()

    # Track facing during navigation
    facing = FacingState()  # Start with no direction

    print("Step-by-step with facing:")
    for i, edge in enumerate(edges, 1):
        direction = edge["direction"]
        from_loc = edge["from"]
        to_loc = edge["to"]

        print(f"Step {i}: {from_loc} → {to_loc}")
        print(f"  Direction: {direction}")

        if facing.current_direction != FacingState.NONE:
            turn = facing.turn_to_direction(direction)
            print(f"  Turn: {turn} (from {facing.current_direction} to {direction})")

        facing.set_direction(direction)
        print(f"  Now facing: {facing.current_direction}")
        print(f"  Could go back: {facing.get_opposite_direction()}")
        print()

    print(f"Final state: {facing}")
    print(f"Journey directions: {facing.direction_history}")


def practical_example():
    """Practical example of using FacingState in navigation."""

    print("🎯 PRACTICAL EXAMPLE")
    print("=" * 50)

    # Simulate a person walking
    walker = FacingState(FacingState.NORTH)  # Person starts facing North

    print(f"Walker starts facing: {walker.get_direction()}")

    # Get navigation from Police Station to Bakery
    path, edges = get_path_and_edges("Police Station", "Bakery")

    print(f"\nNavigation: {path[0]} → {path[-1]}")

    for edge in edges:
        move_direction = edge["direction"]

        # Calculate turn needed
        turn_needed = walker.turn_to_direction(move_direction)

        if turn_needed != "straight":
            print(f"🔄 Turn {turn_needed} to face {move_direction}")

        print(f"🚶 Walk {move_direction}: {edge['from']} → {edge['to']}")

        # Update walker's facing direction
        walker.set_direction(move_direction)

    print(f"\n✅ Journey complete! Final facing: {walker.get_direction()}")


if __name__ == "__main__":
    demo_facing_state_constructor()
    demo_direction_methods()
    demo_navigation_with_facing()
    practical_example()
