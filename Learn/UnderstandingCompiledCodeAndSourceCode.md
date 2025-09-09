# Understanding Compiled Code vs Source Code in TypeScript Projects

## Overview

This document explains the relationship between TypeScript source code and the compiled JavaScript that runs in production environments. The information is based on a debugging investigation conducted on May 22, 2025, involving a parameter name mismatch between our Python client code and the accounting service's TypeScript API.

## The Problem: Parameter Name Mismatch

We encountered a persistent issue where our Python client code was receiving `400 Bad Request` errors with the message "Missing or invalid required fields" when calling the accounting service's `/api/credits/check` endpoint. Our initial investigation suggested the API expected a parameter named `credits`, but the service was rejecting requests that included this parameter.

## Source Code vs. Runtime Reality

### What the TypeScript source suggested

Upon examining the `credit.controller.ts` file, we found code that looked like this:

```typescript
const { 
  credits: requiredCredits, 
  //userId: bodyUserId, 
  //modelId: bodyModelId 
} = req.body;
```

This suggested that the controller expected a parameter named `"credits"` in the request body, which it was then renaming internally to `requiredCredits` via JavaScript object destructuring with renaming syntax.

### What the compiled JavaScript revealed

When we examined the actual compiled JavaScript running in the Docker container, we found a different implementation:

```javascript
async checkCredits(req, res) {
    try {
        const { requiredCredits } = req.body;
        if (!requiredCredits || requiredCredits <= 0) {
            return res.status(400).json({ message: 'Missing or invalid required fields' });
        }
        // ...
        const hasSufficientCredits = await credit_service_1.default.checkUserCredits(req.user.userId, requiredCredits);
        // ...
    }
}
```

The compiled JavaScript showed that the controller was directly looking for a parameter named `"requiredCredits"` in the request body, not `"credits"`.

## Key Insights

1. **Compiled Code is the Source of Truth**: The behavior of a running service depends on the compiled JavaScript code, not the TypeScript source files. Always examine the compiled code when debugging behaviors in production.

2. **Docker Containers Isolate Their Code**: The code running in a Docker container might be different from what you see in your source files, especially if changes have been made but not rebuilt.

3. **Multi-stage Docker Builds for TypeScript**: Our accounting service uses a multi-stage Docker build:
   - First stage: Compiles TypeScript into JavaScript
   - Second stage: Only includes the compiled JavaScript (not source TypeScript)
   
   ```dockerfile
   # Build stage
   FROM node:18-alpine as builder
   
   WORKDIR /usr/src/app
   
   # Copy source code and TypeScript config
   COPY tsconfig.json ./
   COPY src ./src
   
   # Build TypeScript code
   RUN npm run build
   
   # Production stage
   FROM node:18-alpine
   
   # Copy only built files from builder stage
   COPY --from=builder /usr/src/app/dist ./dist
   ```

4. **Parameter Naming Conventions**:
   - In TypeScript source: The controller was using destructuring with renaming (`{ credits: requiredCredits }`)
   - In compiled JavaScript: The code was using direct destructuring (`{ requiredCredits }`)
   - In service methods: The `checkUserCredits` service method consistently used `requiredCredits` as the parameter name

## Debugging Methodology

Our successful debugging approach involved:

1. **Examining Source Code**: First understanding what the TypeScript code suggested
2. **Running Tests**: Creating a test that tried different parameter names
3. **Rebuilding Docker**: Ensuring the latest code was compiled and deployed
4. **Examining Compiled JavaScript**: Using `docker exec` to check the actual JavaScript running in the container:
   ```bash
   docker exec accounting-service-accounting-service-1 cat /usr/src/app/dist/src/controllers/credit.controller.js
   ```

## Lessons Learned

1. **Trust but Verify**: Source code provides clues, but the running code is what matters.

2. **Multiple Versions Can Coexist**: There can be discrepancies between source files, Git history, compiled code, and deployed images.

3. **Debugging Container Contents**: Tools like `docker exec` are invaluable for examining the code that's actually running.

4. **Comprehensive Testing**: Tests that try multiple parameter variations can help identify API contract mismatches.

5. **Maintain API Documentation**: Clear API documentation would have prevented this issue by explicitly stating the expected parameter names.

## Best Practices for TypeScript Projects

1. **API Consistency**: Maintain consistent parameter names from controllers to services.

2. **TypeScript Interface Contracts**: Define and share interface definitions for API requests and responses.

3. **OpenAPI/Swagger Documentation**: Generate and maintain API documentation that clients can reference.

4. **Robust Input Validation**: Provide clear error messages when required fields are missing.

5. **Regular Rebuilds**: Ensure Docker images are rebuilt when TypeScript code changes.

## Resolution

After identifying that the compiled code expected `"requiredCredits"` (not `"credits"`), we updated our Python client code to use the correct parameter name:

```python
response = self.session.post(
    f"{ACCOUNTING_SERVICE_URL}/credits/check",
    headers=self.headers,
    json={
        "requiredCredits": 100  # Changed from "credits" to "requiredCredits"
    }
)
```

This resolved the 400 error and allowed our tests to pass successfully.