# Understanding Jest Mocking: How We Fixed Our Tests

This guide explains the test problems we encountered and how we solved them, aimed at helping newcomers understand Jest mocking concepts.

## The Problem

Our tests were failing with errors like:

```
TypeError: Cannot read properties of undefined (reading 'mockResolvedValue')
TypeError: streamingSessionService.initializeSession is not a function
```

These errors happen when we try to mock methods on an object that isn't properly set up as a Jest mock.

## Root Cause

The issue stemmed from a mismatch between how our services are exported and how they were being mocked in tests:

1. **How our services are exported**:
   ```typescript
   // Example service
   export class StreamingSessionService { /* ... */ }
   export default new StreamingSessionService(); // We export a singleton instance
   ```

2. **How our tests were trying to use them**:
   ```typescript
   // Incorrect approach
   import { StreamingSessionService } from '../../src/services/streaming-session.service';
   const streamingSessionService = new StreamingSessionService(); // Creating a new instance
   streamingSessionService.initializeSession.mockResolvedValue(/* ... */); // ❌ Error
   ```

The test created a new instance of the service class, but our actual code uses the pre-created singleton instance exported as default.

## The Solution

We fixed the tests using proper Jest mocking techniques:

### 1. Mock the Module First

Always mock modules before importing them:

```typescript
// CORRECT: Mock first, then import
jest.mock('../../src/services/streaming-session.service', () => ({
  initializeSession: jest.fn(),
  finalizeSession: jest.fn(),
  abortSession: jest.fn(),
  // other methods...
}));

// Now import the mocked module
import streamingSessionService from '../../src/services/streaming-session.service';
```

### 2. Use Type Casting for TypeScript

When using TypeScript with Jest mocks, use type casting to get proper autocomplete and type checking:

```typescript
// Cast to Jest mock function type when setting expectations
(streamingSessionService.initializeSession as jest.Mock).mockResolvedValue(mockSession);
```

### 3. Add Authentication for Controller Tests

Controllers often require authenticated users. We added a mock authentication middleware:

```typescript
// Add a mock authentication middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  // Add a mock authenticated user to the request
  req.user = {
    userId: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    role: 'user'
  };
  next();
});
```

### 4. Match Response Structure and Status Codes

Make sure your test expectations match what the controller actually returns:

```typescript
// Check the actual status code (201 for created resources)
expect(response.status).toBe(201);

// Check the response structure matches the controller output
expect(response.body).toEqual({
  sessionId: 'session-123',
  allocatedCredits: 8,
  status: 'active'
});
```

### 5. Handle Date Objects in Responses

When working with dates in JSON responses:

```typescript
// Parse the response session date to compare properly
const responseBody = response.body;
if (responseBody.session && responseBody.session.startedAt) {
  responseBody.session.startedAt = new Date(responseBody.session.startedAt);
}
```

## Important Concepts

### Singleton Pattern vs. New Instances

- **Singleton**: A single instance shared throughout your application
  ```typescript
  export default new Service(); // Pre-created instance
  ```

- **New Instances**: Creating separate copies when needed
  ```typescript
  import { Service } from './service';
  const myService = new Service(); // New instance
  ```

Your tests should mock the same way your code uses the services.

### Order Matters in Jest

1. **Mock First**: Always call `jest.mock()` before importing the module
2. **Then Import**: Import the mocked module after mocking it

```typescript
// RIGHT ORDER
jest.mock('./my-module');
import myModule from './my-module';

// WRONG ORDER - Will not work!
import myModule from './my-module';
jest.mock('./my-module');
```

### Jest Mock Methods

Learn these Jest mocking methods:

- `mockResolvedValue(value)` - Mock an async function that returns a resolved Promise
- `mockRejectedValue(error)` - Mock an async function that returns a rejected Promise
- `mockReturnValue(value)` - Mock a synchronous function
- `mockImplementation((args) => { ... })` - Mock with custom implementation

## Best Practices

1. **Clear Mocks Between Tests**
   ```typescript
   beforeEach(() => {
     jest.clearAllMocks();
   });
   ```

2. **Match Actual Response Structure**
   - Check your API implementation to know what to expect
   - Don't assume response structure

3. **Test Edge Cases**
   - Authentication failures
   - Missing parameters
   - Error handling

4. **Use TypeScript Type Casting**
   ```typescript
   (myService.method as jest.Mock).mockResolvedValue(value);
   ```

## Common Errors and Solutions

| Error | Solution |
|-------|----------|
| `mockResolvedValue is not a function` | Ensure you've properly mocked the function with `jest.fn()` |
| `X is not a function` | Check if you're mocking the correct export (class vs. singleton) |
| `Cannot read property of undefined` | You're trying to mock a method on an object that doesn't exist |
| Status code mismatch | Check your controller for the actual status code used |

## Diagram: Correct Mocking Flow

```
1. Mock the module ➡️ 2. Import the mocked module ➡️ 3. Set mock return values ➡️ 4. Test
```

Following this approach ensures that your tests properly mock the dependencies and produce reliable results.