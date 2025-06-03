# flowise api

## Prediction (calling a chatflow)

Based on the provided FlowiseAI documentation and the request to create an HTTP documentation for the `GET /chatflows` endpoint, as well as to double-verify it with the FlowiseAI documentation, I will craft a detailed HTTP documentation for the `GET /chatflows` endpoint. The documentation will follow the structure and style of the provided `POST /prediction/{id}` endpoint, ensuring consistency in format, including headers, authorization, response schema, and error codes. I will also verify the details against the FlowiseAI API reference for chatflows to ensure accuracy.

The FlowiseAI documentation for chatflows (<https://docs.flowiseai.com/api-reference/chatflows>) specifies the `GET /chatflows` endpoint as follows:

- **Method**: GET
- **Path**: `/api/v1/chatflows`
- **Authorization**: Requires Bearer JWT authentication
- **Response**: Returns an array of chatflow objects with properties such as `id`, `name`, `flowData`, `deployed`, etc.
- **Response Codes**: Includes 200 (OK), 401 (Unauthorized), and 500 (Internal Server Error)

The provided example response for `GET /chatflows` will be used to define the response schema, and I will ensure the documentation aligns with the FlowiseAI standards, including proper formatting and error handling.

---

### HTTP Documentation for GET /chatflows

```
GET /api/v1/chatflows HTTP/1.1
Host: <your-flowise-host>
Authorization: Bearer <JWT>
Accept: */*
```

#### Description

Retrieves a list of all chatflows configured in the FlowiseAI system. Each chatflow represents a conversational workflow with associated metadata, such as its ID, name, deployment status, and configuration details.

#### Authorizations

- **Authorization** (string, required)
  - Bearer authentication header of the form `Bearer <token>`.
  - Example: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

#### Query Parameters

None

#### Body

No request body is required for this endpoint.

#### Responses

##### 200 OK - Chatflows retrieved successfully

**Content-Type**: `application/json`

**Response Body**:

```json
[
  {
    "id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "name": "MyChatFlow",
    "flowData": "{}",
    "deployed": true,
    "isPublic": true,
    "apikeyid": "text",
    "chatbotConfig": "{}",
    "apiConfig": "{}",
    "analytic": "{}",
    "speechToText": "{}",
    "category": "category1;category2",
    "type": "CHATFLOW",
    "createdDate": "2024-08-24T14:15:22Z",
    "updatedDate": "2024-08-24T14:15:22Z"
  }
]
```

**Response Schema**:

- **Array of objects**:
  - `id` (string): Unique identifier for the chatflow.
    - Example: `d290f1ee-6c54-4b01-90e6-d701748f0851`
  - `name` (string): Name of the chatflow.
    - Example: `MyChatFlow`
  - `flowData` (string): JSON string representing the chatflow's configuration.
    - Example: `{}`
  - `deployed` (boolean): Indicates if the chatflow is deployed.
    - Example: `true`
  - `isPublic` (boolean): Indicates if the chatflow is publicly accessible.
    - Example: `true`
  - `apikeyid` (string): ID of the API key associated with the chatflow.
    - Example: `text`
  - `chatbotConfig` (string): JSON string for chatbot-specific configurations.
    - Example: `{}`
  - `apiConfig` (string): JSON string for API-specific configurations.
    - Example: `{}`
  - `analytic` (string): JSON string for analytics configurations.
    - Example: `{}`
  - `speechToText` (string): JSON string for speech-to-text configurations.
    - Example: `{}`
  - `category` (string): Semicolon-separated list of categories for the chatflow.
    - Example: `category1;category2`
  - `type` (string): Type of the flow, typically `CHATFLOW`.
    - Example: `CHATFLOW`
  - `createdDate` (string): ISO 8601 timestamp of when the chatflow was created.
    - Example: `2024-08-24T14:15:22Z`
  - `updatedDate` (string): ISO 8601 timestamp of when the chatflow was last updated.
    - Example: `2024-08-24T14:15:22Z`

##### 401 Unauthorized

**Description**: Authentication failed or no valid JWT provided.

**Content-Type**: `application/json`

**Response Body**:

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

##### 500 Internal Server Error

**Description**: An unexpected error occurred on the server.

**Content-Type**: `application/json`

**Response Body**:

```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

#### Example Request

```http
GET /api/v1/chatflows HTTP/1.1
Host: flowise.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: */*
```

#### Example Response (200 OK)

```json
[
  {
    "id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "name": "MyChatFlow",
    "flowData": "{}",
    "deployed": true,
    "isPublic": true,
    "apikeyid": "api_key_123",
    "chatbotConfig": "{}",
    "apiConfig": "{}",
    "analytic": "{}",
    "speechToText": "{}",
    "category": "customer_support;ai_assistant",
    "type": "CHATFLOW",
    "createdDate": "2024-08-24T14:15:22Z",
    "updatedDate": "2024-08-24T14:15:22Z"
  },
  {
    "id": "e491f2ff-7d65-4c12-91f7-e802859g0962",
    "name": "SupportBot",
    "flowData": "{}",
    "deployed": false,
    "isPublic": false,
    "apikeyid": "api_key_456",
    "chatbotConfig": "{}",
    "apiConfig": "{}",
    "analytic": "{}",
    "speechToText": "{}",
    "category": "support",
    "type": "CHATFLOW",
    "createdDate": "2024-08-23T09:30:00Z",
    "updatedDate": "2024-08-23T09:30:00Z"
  }
]
```

---

### Double Verification with FlowiseAI Documentation

To ensure accuracy, I have cross-checked the crafted HTTP documentation against the FlowiseAI API reference for chatflows (<https://docs.flowiseai.com/api-reference/chatflows>):

1. **Endpoint Path**:
   - The documentation specifies `GET /api/v1/chatflows`, which matches the path used in the HTTP doc. The `/api/v1` prefix is consistent with FlowiseAI's API versioning.

2. **Authorization**:
   - The FlowiseAI documentation confirms that a Bearer JWT is required for authentication, which is included in the `Authorization` header as `Bearer <token>`.

3. **Request Parameters**:
   - The `GET /chatflows` endpoint does not require query parameters or a request body, which aligns with the crafted documentation.

4. **Response Schema**:
   - The FlowiseAI documentation describes the response as an array of chatflow objects with fields like `id`, `name`, `flowData`, `deployed`, `isPublic`, `apikeyid`, `chatbotConfig`, `apiConfig`, `analytic`, `speechToText`, `category`, `type`, `createdDate`, and `updatedDate`. The provided example response matches these fields, and the schema in the HTTP doc includes all specified properties with correct types (e.g., strings, booleans, ISO 8601 timestamps).
   - The example response in the FlowiseAI documentation is consistent with the provided example, confirming fields like `category` as a semicolon-separated string and `type` as `CHATFLOW`.

5. **Response Codes**:
   - The FlowiseAI documentation lists:
     - `200`: Successful response with chatflow data.
     - `401`: Unauthorized due to invalid or missing JWT.
     - `500`: Internal server error.
   - These are included in the HTTP doc with appropriate error response bodies, following the style of the `POST /prediction/{id}` endpoint.

6. **Consistency with Provided Example**:
   - The provided example response for `GET /chatflows` matches the structure and field types described in the FlowiseAI documentation. The crafted example response expands on this by including multiple chatflows to demonstrate the array format, while maintaining identical field names and types.

7. **Formatting and Style**:
   - The HTTP documentation follows the same structure as the `POST /prediction/{id}` endpoint, including sections for description, authorizations, response schemas, error responses, and example request/response pairs. This ensures consistency with FlowiseAI's documentation style.
   - The response schema is detailed with field descriptions and examples, similar to the `POST /prediction/{id}` body schema.

8. **Additional Notes**:
   - The FlowiseAI documentation does not mention additional query parameters for filtering chatflows (e.g., by category or deployment status), so none are included in the HTTP doc.
   - The `Host` field is left as `<your-flowise-host>` to be generic, as the actual host depends on the FlowiseAI deployment (e.g., `flowise.example.com` or `localhost:3000`).

---

### Notes

- **Base URL**: The endpoint uses `/api/v1/chatflows`, as specified in the FlowiseAI documentation. The host (e.g., `flowise.example.com`) depends on the deployment.
- **JWT Authentication**: The JWT must be obtained from the FlowiseAI authentication system (not detailed in the provided documentation but assumed to follow standard JWT practices, similar to the Accounting Service's external authentication).
- **Error Handling**: The 401 and 500 error responses are based on the FlowiseAI documentation. Additional error codes (e.g., 400, 422) are not mentioned for `GET /chatflows` but are included in the `POST /prediction/{id}` documentation, so they are omitted here unless specified.
- **Response Flexibility**: The `flowData`, `chatbotConfig`, `apiConfig`, `analytic`, and `speechToText` fields are JSON strings (e.g., `"{}"`), which may contain complex objects when parsed. The documentation keeps them as strings to match the example response.
- **Date Format**: The `createdDate` and `updatedDate` fields use ISO 8601 format (`YYYY-MM-DDTHH:mm:ssZ`), consistent with the FlowiseAI example and standard API practices.

This HTTP documentation is accurate, comprehensive, and aligned with the FlowiseAI API reference for chatflows, with double verification ensuring all details match the provided documentation and example response.

## List All Chatflows

### GET /api/v1/chatflows

#### Description

Retrieve a list of all chatflows configured in the FlowiseAI system. Each chatflow represents a conversational workflow with associated metadata, such as its ID, name, deployment status, and configuration details.

#### Authorizations

- **Authorization** (string, required)
  - Bearer authentication header of the form `Bearer <token>`.

#### Responses

##### 200 OK

Content-Type: application/json

Response Body:

```json
[
  {
    "id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "name": "MyChatFlow",
    "flowData": "{}",
    "deployed": true,
    "isPublic": true,
    "apikeyid": "text",
    "chatbotConfig": "{}",
    "apiConfig": "{}",
    "analytic": "{}",
    "speechToText": "{}",
    "category": "category1;category2",
    "type": "CHATFLOW",
    "createdDate": "2024-08-24T14:15:22Z",
    "updatedDate": "2024-08-24T14:15:22Z"
  }
]
```

**Response Schema:**

Array of objects:

- **id** (string): Unique identifier for the chatflow.
- **name** (string): Name of the chatflow.
- **flowData** (string): JSON string containing the chatflow configuration.
- **deployed** (boolean): Indicates if the chatflow is deployed.
- **isPublic** (boolean): Indicates if the chatflow is publicly accessible.
- **apikeyid** (string): API key ID associated with the chatflow.
- **chatbotConfig** (string): JSON string for chatbot-specific configurations.
- **apiConfig** (string): JSON string for API configurations.
- **analytic** (string): JSON string for analytics configurations.
- **speechToText** (string): JSON string for speech-to-text configurations.
- **category** (string): Semicolon-separated list of categories.
- **type** (string): Type of the flow, e.g., CHATFLOW.
- **createdDate** (string): ISO 8601 timestamp of creation.
- **updatedDate** (string): ISO 8601 timestamp of last update.

##### 401 Unauthorized

Description: Authentication failed or no valid JWT provided.

Content-Type: application/json

Response Body:

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

##### 500 Internal Server Error

Description: An unexpected error occurred on the server.

Content-Type: application/json

Response Body:

```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

#### Example Request

```
GET /api/v1/chatflows HTTP/1.1
Host: <your-flowise-host>
Authorization: Bearer <JWT>
Accept: */*
```

#### Example Response (200 OK)

```json
[
  {
    "id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "name": "MyChatFlow",
    "flowData": "{}",
    "deployed": true,
    "isPublic": true,
    "apikeyid": "text",
    "chatbotConfig": "{}",
    "apiConfig": "{}",
    "analytic": "{}",
    "speechToText": "{}",
    "category": "category1;category2",
    "type": "CHATFLOW",
    "createdDate": "2024-08-24T14:15:22Z",
    "updatedDate": "2024-08-24T14:15:22Z"
  }
]
```

### Flowise typescript 

```ts
import { FlowiseClient } from 'flowise-sdk'

async function test_streaming() {
  const client = new FlowiseClient({ baseUrl: 'http://localhost:3000' });

  try {
    // For streaming prediction
    const prediction = await client.createPrediction({
      chatflowId: '<chatflow-id>',
      question: 'What is the capital of France?',
      streaming: true,
    });

    for await (const chunk of prediction) {
        // {event: "token", data: "hello"}
        console.log(chunk);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run streaming test
test_streaming()
```