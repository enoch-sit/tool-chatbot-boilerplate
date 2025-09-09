# Workflow Testing Documentation

This documentation provides details about the workflow tests that validate the interactions between the Authentication, Accounting, and Chat services as described in the FlowSequence.md blueprint.

## Overview

The workflow testing script (`workflow_test.py`) validates the following key scenarios:

1. **Registration Scenario**
2. **Login Scenario**
3. **Credit Allocation Scenario**
4. **User Chat Scenario with Streaming**
5. **Supervisor Interrupt Scenario**

Each scenario tests a specific flow of information and JWT sharing between the three services.

## Prerequisites

Before running the tests, ensure that:

1. All three services (Authentication, Accounting, and Chat) are running
2. The admin user has been created using `create_users.py`
3. The following Python packages are installed:
   - requests
   - aiohttp
   - colorama
   - tqdm

You can install the required packages with:

```bash
pip install requests aiohttp colorama tqdm
```

## Running the Tests

To run all workflow tests:

```bash
python workflow_test.py --all
```

To run a specific scenario (e.g., Credit Allocation):

```bash
python workflow_test.py --scenario 3
```

## Test Scenarios

### 1. Registration Scenario

This scenario tests the user registration flow, including:

- Creating a new user through the Authentication service
- Retrieving the verification token
- Verifying the user's email

This validates the flow shown in the "Registration Scenario" diagram in FlowSequence.md.

### 2. Login Scenario

This scenario tests the authentication flow, including:

- User login with credentials
- JWT token issuance
- Token validation

This validates the flow shown in the "Login Scenario" diagram in FlowSequence.md.

### 3. Credit Allocation Scenario

This scenario tests the credit allocation process, including:

- Admin authentication
- Cross-service communication between Authentication and Accounting
- Credit allocation to a user
- Verification of user's credit balance

This validates the flow shown in the "Credit Allocation Scenario" diagram in FlowSequence.md, where an admin allocates credits to a user, and JWT tokens are used for authentication between services.

### 4. User Chat Scenario with Streaming

This scenario tests the chat streaming flow, including:

- Creating a chat session
- Streaming a response 
- Credit checking and allocation
- Usage recording

This validates the flow shown in the "User Chat Scenario with Streaming" diagram in FlowSequence.md, where JWT tokens are forwarded between Chat and Accounting services to validate credits before streaming.

### 5. Supervisor Interrupt Scenario

This scenario tests the supervisor interruption flow, including:

- Supervisor authentication
- Identifying active streaming sessions
- Interrupting an active session
- Adding supervisor feedback
- Verifying accounting records after interruption

This validates the flow shown in the "Supervisor Interrupt Scenario" diagram in FlowSequence.md.

## JWT Security Testing

The testing script also validates the JWT security architecture described in FlowSequence.md:

- All services share the same JWT secret for token verification
- Services don't share database access - they only trust the data in validated JWT tokens
- User data flows between services via JWT payloads
- Service-to-service communication uses the user's JWT in request headers
- Only the Authentication Service can issue new tokens

## Test Results

The testing script generates two output files:

1. A log file with detailed information about each test step
2. A markdown report summarizing the test results

These files are stored in the `test_logs` directory with timestamps in their filenames.

## Troubleshooting

If tests fail, check the following:

1. Ensure all three services are running and healthy
2. Verify the admin user exists and has the correct credentials
3. Check that the service URLs in the script match your deployment
4. Review the detailed log file for specific error messages

## Sequence Diagrams

For detailed sequence diagrams of each tested workflow, refer to the FlowSequence.md file in the Design/Blueprints directory.

# Accounting Service Tests

## Test Setup

This directory contains tests for the Accounting Service. The tests use Jest as the testing framework and are configured to mock database connections to avoid requiring a real database during test execution.

## Configuration

- **Jest Configuration**: The main Jest configuration is in `jest.config.js` in the project root.
- **Test Environment**: Tests use a custom setup file `jest.setup.js` which:
  - Loads environment variables from `.env.test`
  - Mocks all services that interact with the database
  - Sets up a consistent timezone (UTC) for date handling

## Mocked Services

To prevent actual database connections during tests, the following services are mocked:

1. **UserAccountService**: Provides fake implementations for `findOrCreateUser` and `userExists` methods
2. **StreamingSessionService**: Mocks session creation, retrieval, and management
3. **UsageService**: Mocks usage recording and retrieval

## Running Tests

To run the tests, use:

```bash
npm test
```

For more verbose output:

```bash
npx jest --verbose
```

To run a specific test file:

```bash
npx jest path/to/test/file.test.ts
```

## Troubleshooting

### Database Connection Issues

If you see database connection errors during tests:

1. **Check the mocks**: Ensure all services that connect to the database are properly mocked in `jest.setup.js`
2. **Service dependencies**: If a new service was added that connects to the database, it needs to be mocked
3. **Direct model usage**: Ensure tests are using mocked models instead of directly accessing the database

### Expected vs Actual Results Mismatch

If tests fail with "Expected X but received Y":

1. **Mock implementation**: Check if the mocked services are returning the expected data structure
2. **Test expectations**: Verify that test expectations align with the mocked data

## Adding New Tests

When adding new tests:

1. **Mock dependencies**: Use `jest.mock()` to mock any dependencies that would hit the database
2. **Consistent data**: Use the mock data patterns established in existing tests
3. **Isolation**: Ensure tests are isolated and don't depend on execution order

## Database Strategy

These tests use complete mocking of database interactions rather than using a test database. This approach:

- Makes tests faster and more reliable
- Avoids needing a running database for CI/CD
- Isolates tests from database schema changes

For integration tests that verify actual database interactions, see the integration test guide.