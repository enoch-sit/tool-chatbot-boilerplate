"""
Simple test script for the Path Tool API
"""

import requests
import json
import os
from pathlib import Path


# API Key for testing
API_KEY = os.getenv("API_KEY", "your-secret-api-key-change-this")
AUTH_HEADERS = {"Authorization": f"Bearer {API_KEY}"}


def test_api(base_url="http://localhost:8001/simpletool"):
    """Test all API endpoints."""

    print(f"Testing API at {base_url}")
    print("=" * 50)

    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/health")
        print(f"Health Check: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"Health Check Failed: {e}")
        return False

    # Test locations endpoint
    try:
        response = requests.get(f"{base_url}/locations")
        data = response.json()
        print(f"Locations: Found {data['total_count']} total locations")
        print(f"  Buildings: {len(data['buildings'])}")
        print(f"  Street Nodes: {len(data['street_nodes'])}")
    except Exception as e:
        print(f"Locations Failed: {e}")

    # Test path endpoint (POST) - Without Authentication
    try:
        path_request = {"start": "Police Station", "end": "Bakery"}
        response = requests.post(f"{base_url}/path", json=path_request)
        if response.status_code == 401:
            print(f"\nPath Finding (POST) - No Auth: CORRECTLY REJECTED (401)")
        else:
            print(
                f"\nPath Finding (POST) - No Auth: UNEXPECTED RESPONSE ({response.status_code})"
            )
    except Exception as e:
        print(f"Path Finding (No Auth) Failed: {e}")

    # Test path endpoint (POST) - With Authentication
    try:
        path_request = {"start": "Police Station", "end": "Bakery"}
        response = requests.post(
            f"{base_url}/path", json=path_request, headers=AUTH_HEADERS
        )
        data = response.json()

        if response.status_code == 200 and data["success"]:
            print(f"\nPath Finding (POST) - With Auth: SUCCESS")
            print(f"  Path: {' → '.join(data['path'])}")
            print(f"  Steps: {data['total_steps']}")
            print("  Turn Instructions:")
            for i, edge in enumerate(data["edges"]):
                print(
                    f"    {i+1}. {edge['turn']} → {edge['direction']} to {edge['to']}"
                )
        else:
            print(
                f"Path Finding (With Auth) Failed: {data.get('message') if 'data' in locals() else response.status_code}"
            )
    except Exception as e:
        print(f"Path Finding Failed: {e}")

    # Test path endpoint (GET) - With Authentication
    try:
        response = requests.get(
            f"{base_url}/path/Hospital/Library", headers=AUTH_HEADERS
        )
        data = response.json()

        if response.status_code == 200 and data["success"]:
            print(f"\nPath Finding (GET) - With Auth: SUCCESS")
            print(f"  Path: {' → '.join(data['path'])}")
        else:
            print(
                f"Path Finding (GET) Failed: {data.get('message') if 'data' in locals() else response.status_code}"
            )
    except Exception as e:
        print(f"Path Finding (GET) Failed: {e}")

    # Test example endpoint
    try:
        response = requests.get(f"{base_url}/path/example")
        data = response.json()
        print(f"\nExample Path: {data['example']}")
        print(f"  Formatted Instructions:")
        for instruction in data["formatted_instructions"]:
            print(f"    {instruction}")
    except Exception as e:
        print(f"Example Failed: {e}")

    print("\n" + "=" * 50)
    print("Testing complete!")


def test_local():
    """Test local path_tool module directly."""
    print("Testing local module...")

    try:
        # Import the local module
        import sys

        sys.path.append(".")
        from path_tool import get_path_with_turns, get_available_locations

        # Test locations
        locations = get_available_locations()
        print(f"Local Test: Found {len(locations['all_locations'])} locations")

        # Test pathfinding
        path, edges = get_path_with_turns("Police Station", "Bakery")
        if path:
            print(f"Local Path: {' → '.join(path)}")
            print("Local Edges:")
            for i, edge in enumerate(edges):
                print(f"  {i+1}. {edge}")

    except ImportError:
        print("Could not import local module - make sure path_tool.py exists")
    except Exception as e:
        print(f"Local test failed: {e}")


if __name__ == "__main__":
    print("Simple Path Tool API Test")
    print("========================")

    # Test local module first
    test_local()

    print("\n" + "=" * 50)

    # Test API (assumes server is running)
    try:
        test_api()
    except requests.ConnectionError:
        print("Could not connect to API server.")
        print("Make sure the server is running:")
        print("  python main.py")
        print("  or")
        print("  docker-compose up")
