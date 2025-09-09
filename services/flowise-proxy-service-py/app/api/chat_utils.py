"""
Utility functions for chat operations.
"""
import uuid
import time
import json
import requests
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


def create_session_id(user_id, chatflow_id):
    """Create deterministic but UUID-formatted session ID with timestamp"""
    # Create a namespace UUID (version 5)
    namespace = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")

    # Get current timestamp
    timestamp = int(time.time() * 1000)

    # Combine user_id, chatflow_id, and timestamp
    seed = f"{user_id}:{chatflow_id}:{timestamp}"

    # Generate a UUID based on the namespace and seed
    return str(uuid.uuid5(namespace, seed))


def process_json(full_assistant_response_ls):
    """
    Process a list of JSON strings, combine consecutive token events, and return both token data and metadata.

    Args:
        full_assistant_response_ls (list): List of JSON strings representing events.
    Returns:
        tuple: (token_data_json_string, non_token_events_list)
    """
    result = []  # List to store the final sequence of event objects
    non_Token_event_result = []
    token_data = ""  # String to accumulate data from "token" events

    for good_json_string in full_assistant_response_ls:
        try:
            obj = json.loads(
                good_json_string
            )  # Parse JSON string to dictionary
            
            # Handle both dictionary and list cases
            if isinstance(obj, dict):
                if obj.get("event") == "token":
                    token_data += obj.get("data", "")  # Accumulate token data
                else:
                    # If we have accumulated token data, add it as a single event
                    if token_data:
                        result.append(
                            {"event": "token", "data": token_data}
                        )
                        token_data = ""  # Reset token data
                    # Save the non-token event for metadata storage
                    non_Token_event_result.append(obj)
            elif isinstance(obj, list):
                # Handle case where JSON is a list of events
                print(f"🔍 DEBUG: Processing list of {len(obj)} events")
                for event in obj:
                    if isinstance(event, dict):
                        if event.get("event") == "token":
                            token_data += event.get("data", "")
                        else:
                            # If we have accumulated token data, add it as a single event
                            if token_data:
                                result.append(
                                    {"event": "token", "data": token_data}
                                )
                                token_data = ""  # Reset token data
                            # Save the non-token event for metadata storage
                            non_Token_event_result.append(event)
                    else:
                        print(f"🔍 DEBUG: Skipping non-dict event in list: {event}")
            else:
                print(f"🔍 DEBUG: Skipping non-dict/non-list object: {obj}")
                
        except json.JSONDecodeError as e:
            print(f"🔍 DEBUG: JSON decode error: {e}")
            continue  # Skip invalid JSON strings

    # If there are any remaining tokens (e.g., at the end of the list), add them
    if token_data:
        result.append({"event": "token", "data": token_data})

    # Return both token data and metadata
    return json.dumps(result), non_Token_event_result
