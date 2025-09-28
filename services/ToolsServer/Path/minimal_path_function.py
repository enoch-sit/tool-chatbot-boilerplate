"""
Minimal Path with Edges - Just the Function You Need

Copy this function into your code for simple path finding with edge details.
"""

buildings = [
    "Post Office",  # W5 - West side
    "Train Station",  # W5 - East side
    "Book Shop",  # W4 - East side
    "Hospital",  # W3 - East side
    "Church",  # W3 - West side
    "Police Station",  # W1 - West side
    "Sports Centre",  # N1 - South side
    "Bank",  # N2 - South side
    "Fire Station",  # N3 - South side
    "Supermarket",  # E1 - West side
    "Bakery",  # E2 - West side
    "Clinic",  # E3 - West side
]

from city_map import create_city_map, find_path_with_edges


def get_path_and_edges(start, end):
    """
    Get path and edges between two locations with turn instructions.

    Usage:
        path, edges = get_path_and_edges("Police Station", "W2")

    Returns:
        path: ['Police Station', 'W1', 'W2']
        edges: [
            {'from': 'Police Station', 'to': 'W1', 'direction': 'East', 'turn': 'start'},
            {'from': 'W1', 'to': 'W2', 'direction': 'South', 'turn': 'right'}
        ]
    """
    G = create_city_map()
    path, edges = find_path_with_edges(G, start, end)

    if not path or not edges:
        return path, edges

    # Add turn instructions to edges
    facing = FacingState()

    for i, edge in enumerate(edges):
        direction = edge["direction"]

        if i == 0:
            # First move - no previous direction to turn from
            edge["turn"] = "start"
        else:
            # Calculate turn from previous direction
            turn = facing.turn_to_direction(direction)
            edge["turn"] = turn

        # Update facing for next turn calculation
        facing.set_direction(direction)

    return path, edges


class FacingState:
    """
    Class to track and manage facing directions during navigation.
    """

    # Direction constants
    NORTH = "North"
    SOUTH = "South"
    EAST = "East"
    WEST = "West"
    NONE = "None"

    def __init__(self, initial_direction=None):
        """
        Constructor for FacingState.

        Args:
            initial_direction (str): Initial facing direction ('North', 'South', 'East', 'West', or None)
        """
        self.current_direction = initial_direction or self.NONE
        self.direction_history = [self.current_direction]

    def set_direction(self, new_direction):
        """
        Set a new facing direction.

        Args:
            new_direction (str): New direction to face
        """
        if new_direction in [self.NORTH, self.SOUTH, self.EAST, self.WEST, self.NONE]:
            self.current_direction = new_direction
            self.direction_history.append(new_direction)
        else:
            raise ValueError(f"Invalid direction: {new_direction}")

    def get_direction(self):
        """
        Get current facing direction.

        Returns:
            str: Current facing direction
        """
        return self.current_direction

    def get_opposite_direction(self):
        """
        Get the opposite of current facing direction.

        Returns:
            str: Opposite direction
        """
        opposites = {
            self.NORTH: self.SOUTH,
            self.SOUTH: self.NORTH,
            self.EAST: self.WEST,
            self.WEST: self.EAST,
            self.NONE: self.NONE,
        }
        return opposites.get(self.current_direction, self.NONE)

    def turn_to_direction(self, target_direction):
        """
        Calculate turn needed to face target direction.

        Args:
            target_direction (str): Direction to turn to

        Returns:
            str: Turn instruction ('left', 'right', 'around', 'straight')
        """
        if self.current_direction == target_direction:
            return "straight"

        # Define turn relationships (current -> target: turn_needed)
        turn_map = {
            (self.NORTH, self.EAST): "right",
            (self.NORTH, self.SOUTH): "around",
            (self.NORTH, self.WEST): "left",
            (self.EAST, self.SOUTH): "right",
            (self.EAST, self.WEST): "around",
            (self.EAST, self.NORTH): "left",
            (self.SOUTH, self.WEST): "right",
            (self.SOUTH, self.NORTH): "around",
            (self.SOUTH, self.EAST): "left",
            (self.WEST, self.NORTH): "right",
            (self.WEST, self.EAST): "around",
            (self.WEST, self.SOUTH): "left",
        }

        return turn_map.get((self.current_direction, target_direction), "unknown")

    def __str__(self):
        """String representation of FacingState."""
        return f"FacingState(current={self.current_direction})"

    def __repr__(self):
        """Detailed string representation."""
        return f"FacingState(current='{self.current_direction}', history={self.direction_history})"


# Quick test
if __name__ == "__main__":
    print("🗺️ PATH WITH TURN INSTRUCTIONS")
    print("=" * 50)

    # Test different routes
    test_routes = [
        ("Police Station", "Train Station"),
        ("Church", "Fire Station"),
        ("Sports Centre", "Bakery"),
    ]

    for start, end in test_routes:
        print(f"\n{start} → {end}:")
        print("-" * 40)

        path, edges = get_path_and_edges(start, end)

        if path and edges:
            print(f"Path: {' → '.join(path)}")
            print("Navigation:")

            for i, edge in enumerate(edges, 1):
                direction = edge["direction"]
                turn = edge["turn"]
                from_loc = edge["from"]
                to_loc = edge["to"]

                if turn == "start":
                    print(f"  {i}. Start walking {direction}: {from_loc} → {to_loc}")
                elif turn == "straight":
                    print(f"  {i}. Walk straight {direction}: {from_loc} → {to_loc}")
                else:
                    print(
                        f"  {i}. Turn {turn}, walk {direction}: {from_loc} → {to_loc}"
                    )
        else:
            print("No path found!")

    print("\n" + "=" * 50)
    print("SIMPLE EDGE OUTPUT WITH TURNS")
    print("=" * 50)

    # Simple output format
    path, edges = get_path_and_edges("Police Station", "Bakery")

    print(f"Route: {path[0]} → {path[-1]}")
    print("Steps:")
    for edge in edges:
        print(f"  {edge}")
        print(f"  Turn: {edge['turn']}, Direction: {edge['direction']}")
