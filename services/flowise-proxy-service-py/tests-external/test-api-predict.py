import os
from dotenv import load_dotenv
from flowise import Flowise, PredictionData, IMessage, IFileUpload

# Load environment variables from .env file in parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Extract chatflow ID from the API URL
CHATFLOW_ID = "e13cbaa3-c909-4570-8c49-78b45115f34a"
API_KEY = os.getenv('FLOWISE_API_KEY')
FLOWISE_ENDPOINT = os.getenv('FLOWISE_ENDPOINT')

def example_non_streaming():
    # Initialize Flowise client
    client = Flowise(FLOWISE_ENDPOINT, API_KEY)

    # Create a prediction without streaming
    completion = client.create_prediction(
        PredictionData(
            chatflowId=CHATFLOW_ID,
            question="Hey, how are you?",
            streaming=False  # Non-streaming mode
        )
    )

    # Process and print the full response
    for response in completion:
        print("Non-streaming response:", response)

def example_streaming():
    # Initialize Flowise client
    client = Flowise(FLOWISE_ENDPOINT, API_KEY)

    # Create a prediction with streaming enabled
    completion = client.create_prediction(
        PredictionData(
            chatflowId=CHATFLOW_ID,
            question="Tell me a joke!",
            streaming=True  # Enable streaming
        )
    )

    # Process and print each streamed chunk
    print("Streaming response:")
    for chunk in completion:
        print(chunk)


if __name__ == "__main__":
    # Run the non-streaming example
    example_non_streaming()

    # Run the streaming example
    example_streaming()