"""
Super Simple Path with Turn Instructions

Just the basic function you need with turn instructions included.
"""

from city_map import create_city_map, find_path_with_edges


class FacingState:
    NORTH, SOUTH, EAST, WEST = "North", "South", "East", "West"

    def __init__(self):
        self.current = None

    def turn_to(self, target):
        if self.current == target:
            return "straight"
        if self.current is None:
            return "start"

        turns = {
            ("North", "East"): "right",
            ("North", "South"): "around",
            ("North", "West"): "left",
            ("East", "South"): "right",
            ("East", "West"): "around",
            ("East", "North"): "left",
            ("South", "West"): "right",
            ("South", "North"): "around",
            ("South", "East"): "left",
            ("West", "North"): "right",
            ("West", "East"): "around",
            ("West", "South"): "left",
        }
        return turns.get((self.current, target), "unknown")


def get_path_with_turns(start, end):
    """
    Simple function: input start/end, output path with turn instructions.

    Returns:
        path: list of nodes
        edges: list with 'from', 'to', 'direction', 'turn'
    """
    G = create_city_map()
    path, edges = find_path_with_edges(G, start, end)

    if not edges:
        return path, edges

    # Add turn instructions
    facing = FacingState()
    for edge in edges:
        edge["turn"] = facing.turn_to(edge["direction"])
        facing.current = edge["direction"]

    return path, edges


# Test it
if __name__ == "__main__":
    print("🧭 SIMPLE PATH WITH TURNS")
    print("=" * 40)

    # Test your example: W2 to W1
    path, edges = get_path_with_turns("W2", "W1")
    print("W2 → W1:")
    for edge in edges:
        print(f"  {edge['turn']} → {edge['direction']}: {edge['from']} to {edge['to']}")

    print("\nPolice Station → Bakery:")
    path, edges = get_path_with_turns("Police Station", "Bakery")
    for edge in edges:
        turn = edge["turn"]
        direction = edge["direction"]
        from_to = f"{edge['from']} → {edge['to']}"

        if turn == "start":
            print(f"  Start {direction}: {from_to}")
        elif turn == "straight":
            print(f"  Straight {direction}: {from_to}")
        else:
            print(f"  Turn {turn} → {direction}: {from_to}")

    print(f"\nComplete path: {' → '.join(path)}")

    print("\nRaw edge data:")
    for edge in edges:
        print(f"  {edge}")
