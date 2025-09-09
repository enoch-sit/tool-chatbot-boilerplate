import os
import requests
import json
from dotenv import load_dotenv

# Load environment variables from .env file in parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Extract chatflow ID from the API URL
# CHATFLOW_ID = "e13cbaa3-c909-4570-8c49-78b45115f34a"
API_KEY = os.getenv('FLOWISE_API_KEY')
FLOWISE_ENDPOINT = os.getenv('FLOWISE_ENDPOINT')

def test_list_chatflows():
    """
    Test the GET /api/v1/chatflows endpoint to retrieve all chatflows
    """
    # Construct the API URL
    url = f"{FLOWISE_ENDPOINT}/api/v1/chatflows"
    
    # Set up headers with Bearer authentication
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Accept': 'application/json'
    }
    
    print(f"Testing GET {url}")
    print(f"Headers: {headers}")
    
    try:
        # Make the GET request
        response = requests.get(url, headers=headers)
        
        # Print response details
        print(f"\nResponse Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        # Check if request was successful
        if response.status_code == 200:
            print("✅ SUCCESS: List chatflows request successful!")
            
            # Parse and display response data
            chatflows = response.json()
            print(f"\nNumber of chatflows found: {len(chatflows)}")
            
            # Display each chatflow's basic info
            for i, chatflow in enumerate(chatflows, 1):
                print(f"\n--- Chatflow {i} ---")
                print(f"ID: {chatflow.get('id', 'N/A')}")
                print(f"Name: {chatflow.get('name', 'N/A')}")
                print(f"Deployed: {chatflow.get('deployed', 'N/A')}")
                print(f"Public: {chatflow.get('isPublic', 'N/A')}")
                print(f"Category: {chatflow.get('category', 'N/A')}")
                print(f"Type: {chatflow.get('type', 'N/A')}")
                print(f"Created: {chatflow.get('createdDate', 'N/A')}")
                print(f"Updated: {chatflow.get('updatedDate', 'N/A')}")
            
            # Pretty print the full JSON response for debugging
            print(f"\n--- Full Response ---")
            print(json.dumps(chatflows, indent=2))
            
        elif response.status_code == 401:
            print("❌ ERROR: Authentication failed (401 Unauthorized)")
            print("Please check your API key and ensure it's valid")
            print(f"Response: {response.text}")
            
        elif response.status_code == 500:
            print("❌ ERROR: Internal Server Error (500)")
            print(f"Response: {response.text}")
            
        else:
            print(f"❌ ERROR: Unexpected status code {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Connection failed. Check if the Flowise server is running and accessible.")
        print(f"Endpoint: {FLOWISE_ENDPOINT}")
        
    except requests.exceptions.Timeout:
        print("❌ ERROR: Request timed out")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ ERROR: Request failed with exception: {str(e)}")
        
    except json.JSONDecodeError:
        print("❌ ERROR: Failed to parse JSON response")
        print(f"Raw response: {response.text}")
        
    except Exception as e:
        print(f"❌ ERROR: Unexpected error: {str(e)}")

def validate_environment():
    """
    Validate that required environment variables are set
    """
    print("=== Environment Validation ===")
    
    if not FLOWISE_ENDPOINT:
        print("❌ ERROR: FLOWISE_ENDPOINT not found in environment variables")
        return False
    else:
        print(f"✅ FLOWISE_ENDPOINT: {FLOWISE_ENDPOINT}")
    
    if not API_KEY:
        print("❌ ERROR: FLOWISE_API_KEY not found in environment variables")
        return False
    else:
        print(f"✅ FLOWISE_API_KEY: {'*' * (len(API_KEY) - 4)}{API_KEY[-4:] if len(API_KEY) > 4 else '****'}")
    
    #print(f"✅ CHATFLOW_ID (for reference): {CHATFLOW_ID}")
    return True

if __name__ == "__main__":
    print("=== Flowise List Chatflows API Test ===")
    
    # Validate environment first
    if validate_environment():
        print("\n=== Running Test ===")
        test_list_chatflows()
    else:
        print("\n❌ Environment validation failed. Please check your .env file.")
        print("\nExpected .env file should contain:")
        print("FLOWISE_ENDPOINT=http://your-flowise-host:port")
        print("FLOWISE_API_KEY=your-jwt-token")
