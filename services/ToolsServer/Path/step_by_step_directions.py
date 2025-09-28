"""
Step-by-Step Direction Handler for City Map Navigation

This module provides specialized functions for generating detailed navigation instructions
with building entrance/exit information, street context, and compass-based directions.

Features:
- Building entrance and exit directions
- Street-specific routing instructions
- Compass-based navigation (North, South, East, West)
- Turn-by-turn directions with contextual information
- Multiple output formats (list, string, detailed)

Author: Generated for thankGodForJesusChrist
Date: September 2025
"""

from typing import List, Dict, Tuple, Optional, Union
from dataclasses import dataclass


@dataclass
class NavigationStep:
    """Represents a single step in navigation instructions"""

    step_number: int
    instruction_type: str  # 'exit', 'move', 'turn', 'enter'
    direction: str
    from_location: str
    to_location: str
    street_context: str
    details: str = ""


class StepByStepDirections:
    """
    Handles generation of detailed step-by-step navigation instructions
    for the city map navigation system.
    """

    def __init__(self):
        """Initialize the direction handler with building and street data"""
        self.exit_directions = {
            "Post Office": {
                "direction": "EAST",
                "street": "West Street (W5)",
                "description": "Exit Post Office heading EAST to West Street (W5)",
            },
            "Train Station": {
                "direction": "WEST",
                "street": "West Street (W5)",
                "description": "Exit Train Station heading WEST to West Street (W5)",
            },
            "Book Shop": {
                "direction": "WEST",
                "street": "West Street (W4)",
                "description": "Exit Book Shop heading WEST to West Street (W4)",
            },
            "Hospital": {
                "direction": "WEST",
                "street": "West Street (W3)",
                "description": "Exit Hospital heading WEST to West Street (W3)",
            },
            "Church": {
                "direction": "EAST",
                "street": "West Street (W3)",
                "description": "Exit Church heading EAST to West Street (W3)",
            },
            "Police Station": {
                "direction": "EAST",
                "street": "West Street (W1)",
                "description": "Exit Police Station heading EAST to West Street (W1)",
            },
            "Sports Centre": {
                "direction": "SOUTH",
                "street": "North Street (N1)",
                "description": "Exit Sports Centre heading SOUTH to North Street (N1)",
            },
            "Bank": {
                "direction": "NORTH",
                "street": "North Street (N2)",
                "description": "Exit Bank heading NORTH to North Street (N2)",
            },
            "Fire Station": {
                "direction": "NORTH",
                "street": "North Street (N3)",
                "description": "Exit Fire Station heading NORTH to North Street (N3)",
            },
            "Supermarket": {
                "direction": "EAST",
                "street": "East Street (E1)",
                "description": "Exit Supermarket heading EAST to East Street (E1)",
            },
            "Bakery": {
                "direction": "EAST",
                "street": "East Street (E2)",
                "description": "Exit Bakery heading EAST to East Street (E2)",
            },
            "Clinic": {
                "direction": "EAST",
                "street": "East Street (E3)",
                "description": "Exit Clinic heading EAST to East Street (E3)",
            },
        }

        self.entrance_directions = {
            "Post Office": {
                "direction": "EAST",
                "street": "West Street (W5)",
                "description": "Enter Post Office from West Street (W5) - entrance faces EAST",
            },
            "Train Station": {
                "direction": "WEST",
                "street": "West Street (W5)",
                "description": "Enter Train Station from West Street (W5) - entrance faces WEST",
            },
            "Book Shop": {
                "direction": "WEST",
                "street": "West Street (W4)",
                "description": "Enter Book Shop from West Street (W4) - entrance faces WEST",
            },
            "Hospital": {
                "direction": "WEST",
                "street": "West Street (W3)",
                "description": "Enter Hospital from West Street (W3) - entrance faces WEST",
            },
            "Church": {
                "direction": "EAST",
                "street": "West Street (W3)",
                "description": "Enter Church from West Street (W3) - entrance faces EAST",
            },
            "Police Station": {
                "direction": "EAST",
                "street": "West Street (W1)",
                "description": "Enter Police Station from West Street (W1) - entrance faces EAST",
            },
        }

    def get_street_context(self, current_node: str, next_node: str) -> str:
        """
        Determine the street context for navigation between two nodes.

        Args:
            current_node: Current location node
            next_node: Next location node

        Returns:
            str: Street name or context description
        """
        if current_node.startswith("W") and next_node.startswith("W"):
            return "West Street"
        elif current_node.startswith("N") and next_node.startswith("N"):
            return "North Street"
        elif current_node.startswith("E") and next_node.startswith("E"):
            return "East Street"
        elif (current_node.startswith("W") and next_node.startswith("N")) or (
            current_node.startswith("N") and next_node.startswith("W")
        ):
            return "to connecting intersection"
        elif (current_node.startswith("N") and next_node.startswith("E")) or (
            current_node.startswith("E") and next_node.startswith("N")
        ):
            return "to connecting intersection"
        else:
            return "street"

    def generate_step_by_step_directions(
        self, path: List[str], path_edges: List[Dict[str, str]]
    ) -> List[NavigationStep]:
        """
        Generate detailed step-by-step navigation instructions.

        Args:
            path: List of nodes in the path
            path_edges: List of edge dictionaries with direction information

        Returns:
            List[NavigationStep]: Detailed navigation steps
        """
        if not path or not path_edges:
            return []

        steps = []
        step_number = 1
        start_location = path[0]
        end_location = path[-1]

        # Add exit instruction if starting from a building
        if start_location in self.exit_directions:
            exit_info = self.exit_directions[start_location]
            steps.append(
                NavigationStep(
                    step_number=step_number,
                    instruction_type="exit",
                    direction=exit_info["direction"],
                    from_location=start_location,
                    to_location=exit_info["street"],
                    street_context="building_exit",
                    details=exit_info["description"],
                )
            )
            step_number += 1

        # Add movement instructions for each edge
        for edge_info in path_edges:
            current = edge_info["from"]
            next_node = edge_info["to"]
            direction = edge_info["direction"]
            street_context = self.get_street_context(current, next_node)

            if direction != "Unknown":
                instruction = f"Go {direction.upper()} from {current} to {next_node} on {street_context}"
                steps.append(
                    NavigationStep(
                        step_number=step_number,
                        instruction_type="move",
                        direction=direction.upper(),
                        from_location=current,
                        to_location=next_node,
                        street_context=street_context,
                        details=instruction,
                    )
                )
            else:
                # Fallback for missing direction data
                instruction = f"Move from {current} to {next_node}"
                steps.append(
                    NavigationStep(
                        step_number=step_number,
                        instruction_type="move",
                        direction="Unknown",
                        from_location=current,
                        to_location=next_node,
                        street_context=street_context,
                        details=instruction,
                    )
                )

            step_number += 1

        # Add entrance instruction if ending at a building
        if end_location in self.entrance_directions:
            entrance_info = self.entrance_directions[end_location]
            steps.append(
                NavigationStep(
                    step_number=step_number,
                    instruction_type="enter",
                    direction=entrance_info["direction"],
                    from_location=entrance_info["street"],
                    to_location=end_location,
                    street_context="building_entrance",
                    details=entrance_info["description"],
                )
            )

        return steps

    def format_instructions_as_list(self, steps: List[NavigationStep]) -> List[str]:
        """
        Format navigation steps as a simple list of instruction strings.

        Args:
            steps: List of NavigationStep objects

        Returns:
            List[str]: Formatted instruction strings
        """
        return [f"{step.step_number}. {step.details}" for step in steps]

    def format_instructions_as_string(
        self, start: str, end: str, path: List[str], steps: List[NavigationStep]
    ) -> str:
        """
        Format navigation instructions as a complete formatted string.

        Args:
            start: Starting location
            end: Destination location
            path: Complete path nodes
            steps: Navigation steps

        Returns:
            str: Complete formatted navigation instructions
        """
        if not steps:
            return f"No navigation instructions available from {start} to {end}"

        instructions = [
            f"🗺️ NAVIGATION: {start} → {end}",
            f"📍 Path: {' → '.join(path)}",
            f"📏 Total Steps: {len(steps)}",
            "",
            "📋 STEP-BY-STEP INSTRUCTIONS:",
        ]

        # Add each step
        for step in steps:
            instructions.append(f"{step.step_number}. {step.details}")

        # Add navigation summary
        instructions.extend(
            [
                "",
                "✅ NAVIGATION SUMMARY:",
                f"• Route: {start} → {end}",
                f"• Total navigation steps: {len(steps)}",
                f"• Path length: {len(path)} nodes",
                "• All directions use compass headings (NORTH/SOUTH/EAST/WEST)",
            ]
        )

        return "\n".join(instructions)

    def get_detailed_step_info(self, steps: List[NavigationStep]) -> Dict[str, any]:
        """
        Get detailed analysis of navigation steps.

        Args:
            steps: List of NavigationStep objects

        Returns:
            Dict: Detailed step analysis
        """
        if not steps:
            return {}

        # Count step types
        step_types = {}
        directions_used = set()
        streets_used = set()

        for step in steps:
            step_types[step.instruction_type] = (
                step_types.get(step.instruction_type, 0) + 1
            )
            if step.direction != "Unknown":
                directions_used.add(step.direction)
            if step.street_context not in ["building_exit", "building_entrance"]:
                streets_used.add(step.street_context)

        # Calculate direction changes
        directions_sequence = [
            step.direction
            for step in steps
            if step.instruction_type == "move" and step.direction != "Unknown"
        ]
        direction_changes = sum(
            1
            for i in range(1, len(directions_sequence))
            if directions_sequence[i] != directions_sequence[i - 1]
        )

        return {
            "total_steps": len(steps),
            "step_types": step_types,
            "directions_used": list(directions_used),
            "streets_used": list(streets_used),
            "direction_changes": direction_changes,
            "directions_sequence": directions_sequence,
        }

    def generate_navigation_from_path_edges(
        self,
        start: str,
        end: str,
        path: List[str],
        path_edges: List[Dict[str, str]],
        format_type: str = "string",
    ) -> Union[str, List[str], List[NavigationStep], Dict]:
        """
        Main function to generate navigation instructions from path and edges.

        Args:
            start: Starting location
            end: Destination location
            path: List of path nodes
            path_edges: List of edge information dictionaries
            format_type: Output format ('string', 'list', 'steps', 'analysis')

        Returns:
            Union: Formatted instructions based on format_type
        """
        if not path or not path_edges:
            if format_type == "string":
                return f"No path found from {start} to {end}"
            elif format_type == "list":
                return [f"No path found from {start} to {end}"]
            elif format_type == "steps":
                return []
            else:
                return {}

        # Generate navigation steps
        steps = self.generate_step_by_step_directions(path, path_edges)

        # Return based on requested format
        if format_type == "string":
            return self.format_instructions_as_string(start, end, path, steps)
        elif format_type == "list":
            return self.format_instructions_as_list(steps)
        elif format_type == "steps":
            return steps
        elif format_type == "analysis":
            return self.get_detailed_step_info(steps)
        else:
            raise ValueError(
                f"Invalid format_type: {format_type}. Use 'string', 'list', 'steps', or 'analysis'"
            )


def create_step_by_step_directions() -> StepByStepDirections:
    """
    Factory function to create a StepByStepDirections instance.

    Returns:
        StepByStepDirections: Configured direction handler
    """
    return StepByStepDirections()


# Example usage and testing functions
def demo_step_by_step_directions():
    """Demonstrate the step-by-step direction functionality"""
    print("🧭 STEP-BY-STEP DIRECTIONS DEMO")
    print("=" * 50)

    # Create direction handler
    direction_handler = create_step_by_step_directions()

    # Example path and edges (would normally come from pathfinding)
    example_path = ["Church", "W3", "W2", "N1", "N2", "E1", "Supermarket", "Bakery"]
    example_edges = [
        {"from": "Church", "to": "W3", "direction": "East"},
        {"from": "W3", "to": "W2", "direction": "North"},
        {"from": "W2", "to": "N1", "direction": "East"},
        {"from": "N1", "to": "N2", "direction": "East"},
        {"from": "N2", "to": "E1", "direction": "South"},
        {"from": "E1", "to": "Supermarket", "direction": "West"},
        {"from": "Supermarket", "to": "Bakery", "direction": "South"},
    ]

    # Test different output formats
    print("\n1. STRING FORMAT:")
    print(
        direction_handler.generate_navigation_from_path_edges(
            "Church", "Bakery", example_path, example_edges, "string"
        )
    )

    print("\n2. LIST FORMAT:")
    instruction_list = direction_handler.generate_navigation_from_path_edges(
        "Church", "Bakery", example_path, example_edges, "list"
    )
    for instruction in instruction_list:
        print(f"   {instruction}")

    print("\n3. DETAILED ANALYSIS:")
    analysis = direction_handler.generate_navigation_from_path_edges(
        "Church", "Bakery", example_path, example_edges, "analysis"
    )
    for key, value in analysis.items():
        print(f"   {key}: {value}")


if __name__ == "__main__":
    demo_step_by_step_directions()
