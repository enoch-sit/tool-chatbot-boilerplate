"""
Simple Path Tool with Turn Instructions

Core module for pathfinding with turn instructions using the default city map.
"""

import networkx as nx
import numpy as np
import matplotlib.pyplot as plt
from typing import List, Dict, Tuple, Optional


def create_city_map():
    """Create the default city map with bidirectional edges and directional labels."""

    # Define all nodes in the system
    node_names = [
        # Buildings
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
        # Street nodes
        "W1",
        "W2",
        "W3",
        "W4",
        "W5",  # West Street
        "N1",
        "N2",
        "N3",  # North Street
        "E1",
        "E2",
        "E3",  # East Street
    ]

    # Create directed graph with edge labels
    G = nx.DiGraph()
    G.add_nodes_from(node_names)

    def add_bidirectional_edge(
        from_node, to_node, from_to_direction, to_from_direction
    ):
        G.add_edge(from_node, to_node, direction=from_to_direction)
        G.add_edge(to_node, from_node, direction=to_from_direction)

    # Building-to-street connections
    add_bidirectional_edge("Post Office", "W5", "East", "West")
    add_bidirectional_edge("Train Station", "W5", "West", "East")
    add_bidirectional_edge("Book Shop", "W4", "West", "East")
    add_bidirectional_edge("Hospital", "W3", "West", "East")
    add_bidirectional_edge("Church", "W3", "East", "West")
    add_bidirectional_edge("Police Station", "W1", "East", "West")
    add_bidirectional_edge("Sports Centre", "N1", "South", "North")
    add_bidirectional_edge("Bank", "N2", "South", "North")
    add_bidirectional_edge("Fire Station", "N3", "South", "North")
    add_bidirectional_edge("Supermarket", "E1", "East", "West")
    add_bidirectional_edge("Bakery", "E2", "East", "West")
    add_bidirectional_edge("Clinic", "E3", "East", "West")

    # Street connections
    add_bidirectional_edge("W1", "W2", "South", "North")
    add_bidirectional_edge("W2", "W3", "South", "North")
    add_bidirectional_edge("W3", "W4", "South", "North")
    add_bidirectional_edge("W4", "W5", "South", "North")
    add_bidirectional_edge("N1", "N2", "East", "West")
    add_bidirectional_edge("N2", "N3", "East", "West")
    add_bidirectional_edge("E1", "E2", "South", "North")
    add_bidirectional_edge("E2", "E3", "South", "North")

    # Inter-street connections
    add_bidirectional_edge("W2", "N1", "East", "West")
    add_bidirectional_edge("N2", "E1", "South", "North")

    # Building adjacencies
    #add_bidirectional_edge("Post Office", "Train Station", "East", "West")
    #add_bidirectional_edge("Hospital", "Church", "West", "East")
    #add_bidirectional_edge("Post Office", "Church", "North", "South")
    #add_bidirectional_edge("Church", "Police Station", "North", "South")
    #add_bidirectional_edge("Train Station", "Book Shop", "North", "South")
    #add_bidirectional_edge("Book Shop", "Hospital", "North", "South")
    #add_bidirectional_edge("Sports Centre", "Bank", "East", "West")
    #add_bidirectional_edge("Bank", "Fire Station", "East", "West")
    #add_bidirectional_edge("Supermarket", "Bakery", "South", "North")
    #add_bidirectional_edge("Bakery", "Clinic", "South", "North")

    return G


def find_path_with_edges(G, start, end):
    """Find shortest path with complete edge information."""
    try:
        path = nx.dijkstra_path(G, start, end)
        path_edges = []

        for i in range(len(path) - 1):
            current = path[i]
            next_node = path[i + 1]
            edge_data = G.get_edge_data(current, next_node)
            path_edges.append(
                {
                    "from": current,
                    "to": next_node,
                    "direction": (
                        edge_data.get("direction", "Unknown")
                        if edge_data
                        else "Unknown"
                    ),
                }
            )

        return path, path_edges
    except nx.NetworkXNoPath:
        return None, None


class FacingState:
    """Simple class to track facing directions and calculate turns."""

    NORTH, SOUTH, EAST, WEST = "North", "South", "East", "West"

    def __init__(self):
        self.current = None

    def turn_to(self, target):
        """Calculate turn instruction to face target direction."""
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


def get_path_with_turns(
    start: str, end: str
) -> Tuple[Optional[List[str]], Optional[List[Dict]]]:
    """
    Main function: Get path with turn instructions.

    Args:
        start: Starting location name
        end: Destination location name

    Returns:
        Tuple of (path_nodes, edges_with_turns) or (None, None) if no path
    """
    # Create city map
    G = create_city_map()

    # Find path with edges
    path, edges = find_path_with_edges(G, start, end)

    if not edges:
        return path, edges

    # Add turn instructions
    facing = FacingState()
    for edge in edges:
        edge["turn"] = facing.turn_to(edge["direction"])
        facing.current = edge["direction"]

    return path, edges


def get_available_locations() -> Dict[str, List[str]]:
    """Get all available locations in the city map."""
    G = create_city_map()

    buildings = [
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

    street_nodes = ["W1", "W2", "W3", "W4", "W5", "N1", "N2", "N3", "E1", "E2", "E3"]

    return {
        "buildings": buildings,
        "street_nodes": street_nodes,
        "all_locations": list(G.nodes()),
    }


# Test the module
if __name__ == "__main__":
    print("🗺️ Simple Path Tool Test")
    print("=" * 40)

    # Test the main function
    path, edges = get_path_with_turns("Police Station", "Bakery")

    if path and edges:
        print(f"Path: {' → '.join(path)}")
        print("\nRaw edge data:")
        for edge in edges:
            print(f"  {edge}")
    else:
        print("No path found!")

    print(
        f"\nAvailable locations: {len(get_available_locations()['all_locations'])} total"
    )
