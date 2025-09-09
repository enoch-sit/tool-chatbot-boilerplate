import uuid
import time
import json
from json_repair import repair_json

def parse_sse_chunk(chunk_str):
    """
    Parse Server-Sent Events (SSE) format chunk and extract JSON data.
    
    SSE format example:
    message:
    data:{"event":"start","data":""}
    
    
    message:
    data:{"event":"token","data":"Hi"}
    
    Args:
        chunk_str: Raw SSE chunk string
        
    Returns:
        List of JSON strings extracted from data: lines
    """
    events = []
    lines = chunk_str.strip().split('\n')
    
    for line in lines:
        line = line.strip()
        if line.startswith('data:'):
            # Extract JSON after "data:"
            json_str = line[5:].strip()  # Remove "data:" prefix
            if json_str and json_str != '[DONE]':
                events.append(json_str)
    
    return events

# Create deterministic but UUID-formatted session ID with timestamp
def create_session_id(user_id, chatflow_id):
    # Create a namespace UUID (version 5)
    namespace = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")

    # Get current timestamp
    timestamp = int(time.time() * 1000)

    # Combine user_id, chatflow_id, and timestamp
    seed = f"{user_id}:{chatflow_id}:{timestamp}"

    # Generate a UUID based on the namespace and seed
    return str(uuid.uuid5(namespace, seed))
