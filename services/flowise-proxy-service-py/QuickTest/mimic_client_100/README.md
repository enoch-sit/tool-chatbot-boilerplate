# Flowise SDK Test Suite

This directory contains test scripts for the Flowise Python SDK and API integration.

## Setup

1. **Install dependencies:**
   ```bash
   pip install flowise python-dotenv colorama pillow requests
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Update the values in `.env` with your Flowise configuration:
     ```
     FLOWISE_API_URL=https://your-flowise-instance.com
     FLOWISE_API_KEY=your-api-key-here
     TARGET_CHATFLOW_ID=your-chatflow-id-here
     ```

## Test Scripts

### 1. Pre-API Test (`mimic_client_10_pre_flowiseapi_test.py`)
Tests basic Flowise API connectivity using direct HTTP requests.

**What it tests:**
- API health check
- Chatflow existence and accessibility
- Simple prediction request
- Streaming prediction request

**Usage:**
```bash
python mimic_client_10_pre_flowiseapi_test.py
```

### 2. Flowise SDK Test (`mimic_client_10_flowise_sdk_test.py`)
Tests the Flowise Python SDK with image upload functionality.

**What it tests:**
- SDK initialization and connection
- Simple chat without image upload
- Image upload chat functionality
- Follow-up chat in the same session

**Usage:**
```bash
python mimic_client_10_flowise_sdk_test.py
```

### 3. Proxy Service Test (`mimic_client_10_Imageupload_10.py`)
Tests the image upload functionality through the proxy service.

**What it tests:**
- Authentication with proxy service
- Chatflow synchronization
- User assignment to chatflow
- Image upload through proxy
- Chat history retrieval

**Usage:**
```bash
python mimic_client_10_Imageupload_10.py
```

### 4. Batch Test Runner (`run_flowise_tests.bat`)
Runs all three tests in sequence.

**Usage:**
```bash
run_flowise_tests.bat
```

## Configuration

The tests use environment variables loaded from `.env` file:

- `FLOWISE_API_URL`: Your Flowise instance URL
- `FLOWISE_API_KEY`: Your Flowise API key
- `TARGET_CHATFLOW_ID`: The chatflow ID that supports image uploads

## Security Notes

- The `.env` file contains sensitive API keys and is excluded from git via `.gitignore`
- Use `.env.example` as a template for your local `.env` file
- Never commit actual API keys to version control

## Log Files

Each test generates its own log file:
- `flowise_pre_test.log` - Pre-test results
- `flowise_sdk_test.log` - SDK test results
- `image_upload_test_10.log` - Proxy service test results

## Current Configuration

The scripts are currently configured for:
- **API URL**: https://aai03.eduhk.hk
- **Chatflow**: Azure (ID: 2042ba88-d822-4503-a4b4-8fddd3cea18c)
- **Test Image**: 100x100 red PNG with "TEST" text

## Troubleshooting

1. **Import errors**: Make sure all dependencies are installed
2. **Connection errors**: Check your API URL and network connectivity
3. **Authentication errors**: Verify your API key is correct
4. **Chatflow errors**: Ensure the chatflow ID exists and supports your use case
