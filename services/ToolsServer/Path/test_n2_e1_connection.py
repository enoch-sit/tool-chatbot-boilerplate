#!/usr/bin/env python3
"""
Test script to verify the N2-E1 connection works properly
"""

from city_map import create_city_map, generate_navigation_instructions, get_node_positions

def test_n2_e1_connection():
    """Test navigation routes that use the N2-E1 connection"""
    
    print("🧪 TESTING N2-E1 CONNECTION")
    print("=" * 50)
    
    # Create the map
    city_map = create_city_map()
    positions = get_node_positions()
    
    # Test routes that should use N2-E1 connection
    test_routes = [
        ("Bank", "Supermarket"),  # Should go: Bank → N2 → E1 → Supermarket
        ("Sports Centre", "Bakery"),  # Should go: Sports Centre → N1 → N2 → E1 → E2 → Bakery
        ("Police Station", "Clinic"),  # Should go through N2-E1 connection
    ]
    
    for start, end in test_routes:
        print(f"\n🗺️ Testing route: {start} → {end}")
        print("-" * 40)
        instructions = generate_navigation_instructions(city_map, start, end, positions)
        print(instructions)
        
        # Check if the route actually uses N2 and E1
        path_line = [line for line in instructions.split('\n') if line.startswith('📍 Path:')]
        if path_line:
            path = path_line[0]
            if 'N2' in path and 'E1' in path:
                print("✅ CONFIRMED: Route uses N2-E1 connection!")
            else:
                print("❌ Route does not use N2-E1 connection")
        print("\n" + "="*50)

if __name__ == "__main__":
    test_n2_e1_connection()