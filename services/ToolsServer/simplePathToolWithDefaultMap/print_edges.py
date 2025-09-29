"""
View all bidirectional edges with direction information
"""

from path_tool import create_city_map

def print_bidirectional_edges():
    """Print all bidirectional edges with their direction labels"""
    G = create_city_map()
    
    print("🗺️ Bidirectional Edges with Direction Information")
    print("=" * 60)
    
    # Get all unique pairs (undirected edges)
    seen_pairs = set()
    edges_info = []
    
    for from_node, to_node, data in G.edges(data=True):
        # Create a sorted pair to avoid duplicates
        pair = tuple(sorted([from_node, to_node]))
        
        if pair not in seen_pairs:
            seen_pairs.add(pair)
            
            # Get both directions
            dir1 = G[from_node][to_node]['direction']
            dir2 = G[to_node][from_node]['direction']
            
            edges_info.append({
                'node1': from_node,
                'node2': to_node,
                'dir1': dir1,
                'dir2': dir2
            })
    
    # Sort by node names for better readability
    edges_info.sort(key=lambda x: (x['node1'], x['node2']))
    
    # Print in organized sections
    print("📍 BUILDING-TO-STREET CONNECTIONS:")
    print("-" * 40)
    buildings = ["Post Office", "Train Station", "Book Shop", "Hospital", 
                "Church", "Police Station", "Sports Centre", "Bank", 
                "Fire Station", "Supermarket", "Bakery", "Clinic"]
    
    for edge in edges_info:
        if (edge['node1'] in buildings and edge['node2'].startswith(('W', 'N', 'E'))) or \
           (edge['node2'] in buildings and edge['node1'].startswith(('W', 'N', 'E'))):
            print(f"{edge['node1']} ↔ {edge['node2']}")
            print(f"  {edge['node1']} → {edge['node2']}: {edge['dir1']}")
            print(f"  {edge['node2']} → {edge['node1']}: {edge['dir2']}")
            print()
    
    print("🛣️ STREET-TO-STREET CONNECTIONS:")
    print("-" * 40)
    for edge in edges_info:
        if edge['node1'].startswith(('W', 'N', 'E')) and edge['node2'].startswith(('W', 'N', 'E')):
            print(f"{edge['node1']} ↔ {edge['node2']}")
            print(f"  {edge['node1']} → {edge['node2']}: {edge['dir1']}")
            print(f"  {edge['node2']} → {edge['node1']}: {edge['dir2']}")
            print()
    
    print("🏢 BUILDING-TO-BUILDING CONNECTIONS:")
    print("-" * 40)
    building_to_building = []
    for edge in edges_info:
        if edge['node1'] in buildings and edge['node2'] in buildings:
            building_to_building.append(edge)
    
    if building_to_building:
        for edge in building_to_building:
            print(f"{edge['node1']} ↔ {edge['node2']}")
            print(f"  {edge['node1']} → {edge['node2']}: {edge['dir1']}")
            print(f"  {edge['node2']} → {edge['node1']}: {edge['dir2']}")
            print()
    else:
        print("  No direct building-to-building connections (commented out)")
    
    print(f"\n📊 SUMMARY:")
    print(f"Total bidirectional connections: {len(edges_info)}")
    print(f"Total directed edges in graph: {G.number_of_edges()}")

if __name__ == "__main__":
    print_bidirectional_edges()