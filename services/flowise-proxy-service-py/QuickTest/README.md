# Chatflow Sync Testing Documentation

This directory contains comprehensive testing tools for the admin chatflow synchronization functionality.

## Files

- `quickTestChatflowsSync.py` - Main test script for chatflow sync functionality
- `run_chatflow_sync_test.bat` - Windows batch file to run the test easily
- `chatflow_sync_test.log` - Generated log file with test results (created during test execution)

## What This Tests

The test script validates the complete admin chatflow management workflow:

### 1. **Chatflow Synchronization** (`POST /api/admin/chatflows/sync`)
- Tests syncing all chatflows from external Flowise endpoint to local database
- Validates sync statistics (created, updated, deleted, errors)
- Ensures proper error handling and logging

### 2. **List Chatflows** (`GET /api/admin/chatflows`)
- Tests retrieving all stored chatflows from database
- Validates filtering (active vs. deleted chatflows)
- Checks chatflow metadata completeness

### 3. **Chatflow Statistics** (`GET /api/admin/chatflows/stats`)
- Tests getting comprehensive sync statistics
- Validates counts for active, deleted, and error states
- Checks last sync timestamp

### 4. **Get Specific Chatflow** (`GET /api/admin/chatflows/{flowise_id}`)
- Tests retrieving detailed information for a specific chatflow
- Validates all metadata fields from Flowise API
- Tests error handling for non-existent chatflows

### 5. **Access Control Testing**
- Ensures non-admin users cannot access admin chatflow endpoints
- Validates proper 403 Forbidden responses
- Tests authentication and authorization

## Prerequisites

Before running the tests, ensure:

1. **Docker Services Running**:
   ```cmd
   docker-compose up -d
   ```

2. **Services Available**:
   - Flowise Proxy Service: `http://localhost:3000`
   - External Auth Service: `http://localhost:3001`
   - MongoDB: Running in container

3. **Test Users Exist**:
   - Admin user: `admin@example.com / admin@admin`
   - Regular user: `user1@example.com / User1@123`

## Running the Tests

### Option 1: Using Batch File (Windows)
```cmd
run_chatflow_sync_test.bat
```

### Option 2: Direct Python Execution
```cmd
cd QuickTest
python quickTestChatflowsSync.py
```

## Expected Output

The test script provides detailed output including:

```
🚀 CHATFLOW SYNC COMPREHENSIVE TEST
============================================================

--- Getting admin access token ---
✅ Admin access token obtained

--- Testing Chatflow Sync ---
✅ Chatflow sync successful
📊 Sync Results:
   - Total fetched: 15
   - Created: 3
   - Updated: 10
   - Deleted: 2
   - Errors: 0

--- Testing List Chatflows ---
✅ Retrieved 13 active chatflows
   Chatflow 1:
     - ID: d290f1ee-6c54-4b01-90e6-d701748f0851
     - Name: MyChatFlow
     - Deployed: True
     - Public: True
     - Sync Status: active

--- Testing Chatflow Statistics ---
✅ Chatflow statistics retrieved
📈 Statistics:
   - Total chatflows: 15
   - Active: 13
   - Deleted: 2
   - Errors: 0
   - Last sync: 2024-12-20T10:30:45Z

--- Testing Get Specific Chatflow ---
✅ Retrieved chatflow details for ID: d290f1ee-6c54-4b01-90e6-d701748f0851
📝 Chatflow Details:
   - Name: MyChatFlow
   - Description: AI assistant for customer support
   - Deployed: True
   - Category: customer-service
   - Type: CHATFLOW

--- Testing Non-Admin Access (user1) ---
✅ Non-admin user 'user1' logged in
✅ Correctly blocked non-admin access to sync endpoint

============================================================
📊 TEST SUMMARY
============================================================
Sync Chatflows: ✅ PASS
List Chatflows: ✅ PASS
Chatflow Stats: ✅ PASS
Get Specific Chatflow: ✅ PASS
Non Admin Access: ✅ PASS

Overall Result: 5/5 tests passed
🎉 ALL TESTS PASSED! Chatflow sync functionality is working correctly.
```

## Test Results and Logging

- **Console Output**: Real-time test progress and results
- **Log File**: `chatflow_sync_test.log` with timestamps and detailed results
- **Exit Codes**: 
  - `0` = All tests passed
  - `1` = Some tests failed

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure Docker services are running
   - Check if ports 3000 and 3001 are accessible

2. **Authentication Failed**
   - Verify admin user exists in the system
   - Check if external auth service is responding

3. **No Chatflows Found**
   - Ensure Flowise instance has chatflows configured
   - Check Flowise API key configuration

4. **Permission Denied**
   - Verify admin user has proper role assignment
   - Check JWT token generation and validation

### Debug Mode

For additional debugging information, modify the script:

```python
# Add this at the top of the script for verbose HTTP debugging
import logging
import http.client as http_client
http_client.HTTPConnection.debuglevel = 1
logging.basicConfig()
logging.getLogger().setLevel(logging.DEBUG)
```

## Configuration

The test script uses these default configurations:

```python
API_BASE_URL = "http://localhost:3000"      # Flowise Proxy Service
ACCOUNT_BASE_URL = "http://localhost:3001"  # External Auth Service

ADMIN_USER = {
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin@admin",
}
```

Modify these values in the script if your setup uses different URLs or credentials.

## Integration with CI/CD

This test script can be integrated into automated testing pipelines:

```yaml
# Example GitHub Actions step
- name: Test Chatflow Sync Functionality
  run: |
    cd QuickTest
    python quickTestChatflowsSync.py
  env:
    API_BASE_URL: http://localhost:3000
    ACCOUNT_BASE_URL: http://localhost:3001
```

## Related Documentation

- [Chatflow Management Documentation](../app/docs/chatflow_management.md)
- [API Endpoints Documentation](../progress/flowiseProxyEndpoints.md)
- [Flowise API Documentation](../flowiseAPI.md)
