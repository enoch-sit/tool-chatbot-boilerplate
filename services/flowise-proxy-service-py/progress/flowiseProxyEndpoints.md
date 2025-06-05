# API Endpoints and Service Information

## Authentication Endpoints

### `POST /chat/authenticate`

**Description:** User authentication with JWT token creation.

**Code Location:** `app/api/chat.py` - `authenticate()` function (lines 32-61)

**Request Headers:**

* `Content-Type: application/json`
* *(Potentially others like `Accept: application/json`)*

**Request Body:**

* *(Example: `{ "username": "user", "password": "password" }` or `{ "api_key": "your_api_key" }`)*

**Response (200 OK):**

* *(Example: `{ "access_token": "jwt_access_token", "refresh_token": "jwt_refresh_token" }`)*

### `POST /chat/refresh`

**Code Location:** `app/api/chat.py` - `refresh_token()` function (lines 63-89)

**Description:** Refresh JWT tokens using external auth service. **NO MIDDLEWARE DEPENDENCY** - this endpoint bypasses the `authenticate_user` middleware to avoid circular dependency issues.

**Request Headers:**

* `Content-Type: application/json`
* *(No Authorization header required - refresh token provided in request body)*

**Request Body:**

* `{ "refresh_token": "your_refresh_token" }`

**Response (200 OK):**

* `{ "access_token": "new_jwt_access_token", "refresh_token": "new_refresh_token", "token_type": "bearer" }`

**Architecture Note:** This endpoint uses the **external auth service** (`ExternalAuthService`) to maintain consistency with the authentication flow where access tokens are obtained from the external API service (localhost:3000).

### `POST /chat/revoke`

**Code Location:** `app/api/chat.py` - `revoke()` function (lines 95-113)

**Description:** Revoke JWT tokens.

**Request Headers:**

* `Authorization: Bearer <access_token>`
* `Content-Type: application/json`

**Request Body (Optional):**

* *(Example: `{ "token": "refresh_token_to_revoke" }` if revoking a specific refresh token, or could be based on the access token in the header)*

**Response (200 OK):**

* *(Example: `{ "message": "Token revoked successfully" }`)*

## Chatflow Endpoints

### `GET /chatflows/`

**Code Location:** `app/api/chatflows.py` - `list_chatflows()` function (lines 10-22)

**Description:** List chatflows available to the authenticated user.

**Request Headers:**

* `Authorization: Bearer <access_token>`

**Request Body:** None

**Response (200 OK):**

* *(Example: `[ { "id": "chatflow_id_1", "name": "Chatflow One" }, { "id": "chatflow_id_2", "name": "Chatflow Two" } ]`)*

### `GET /chatflows/{chatflow_id}`

**Code Location:** `app/api/chatflows.py` - `get_chatflow()` function (lines 24-36)

**Description:** Get specific chatflow details.

**Request Headers:**

* `Authorization: Bearer <access_token>`

**Request Body:** None

**Response (200 OK):**

* *(Example: `{ "id": "chatflow_id_1", "name": "Chatflow One", "details": "..." }`)*

### `GET /chatflows/{chatflow_id}/config`

**Code Location:** `app/api/chatflows.py` - `get_chatflow_config()` function (lines 38-50)

**Description:** Get chatflow configuration.

**Request Headers:**

* `Authorization: Bearer <access_token>`

**Request Body:** None

**Response (200 OK):**

* *(Example: `{ "config_param1": "value1", "config_param2": "value2" }`)*

## Chat Endpoints

### `POST /chat/predict`

**Code Location:** `app/api/chat.py` - `predict()` function (lines 115-145)

**Description:** Send chat prediction request with credit management.

**Request Headers:**

* `Authorization: Bearer <access_token>`
* `Content-Type: application/json`

**Request Body:**

* *(Example: `{ "chatflow_id": "your_chatflow_id", "input": "User's message", "overrideConfig": { ... } }`)*

**Response (200 OK):**

* *(Example: `{ "response": "AI's response", "credits_used": 1 }`)*

### `GET /chat/credits`

**Code Location:** `app/api/chat.py` - `get_credits()` function (lines 147-157)

**Description:** Get user credit balance.

**Request Headers:**

* `Authorization: Bearer <access_token>`

**Request Body:** None

**Response (200 OK):**

* *(Example: `{ "credits": 100 }`)*

## Health & Info Endpoints

### `GET /`

**Code Location:** `app/main.py` - `root()` function (lines 37-44)

**Description:** Root endpoint with service information.

**Request Headers:**

* *(Typically none needed for a root/info endpoint)*

**Request Body:** None

**Response (200 OK):**

* *(Example: `{ "service_name": "Chat Proxy Service", "version": "1.0.0" }`)*

### `GET /health`

**Code Location:** `app/main.py` - `health_check()` function (lines 46-53)

**Description:** Health check endpoint.

**Request Headers:**

* *(Typically none needed)*

**Request Body:** None

**Response (200 OK):**

* *(Example: `{ "status": "UP" }` or `{ "status": "OK", "details": { "database": "connected", "flowise": "healthy" } }`)*

### `GET /info`

**Code Location:** `app/main.py` - `info()` function (lines 55-67)

**Description:** Detailed service information.

**Request Headers:**

* *(Typically none needed)*

**Request Body:** None

**Response (200 OK):**

* *(Example: `{ "service_name": "Chat Proxy Service", "version": "1.0.0", "description": "...", "dependencies": { ... } }`)*

## Common Error Responses

All authenticated endpoints can return these error responses:

* **401 Unauthorized:**
  * *(Description: Authentication token is missing, invalid, or expired. Example: `{ "error": "Unauthorized", "message": "Authentication token is required." }`)*
* **402 Payment Required:**
  * *(Description: User has insufficient credits. Example: `{ "error": "Payment Required", "message": "Insufficient credits to perform this action." }`)*
* **403 Forbidden:**
  * *(Description: User does not have permission to access the resource. Example: `{ "error": "Forbidden", "message": "You do not have permission to access this chatflow." }`)*
* **404 Not Found:**
  * *(Description: The requested resource (e.g., chatflow) was not found. Example: `{ "error": "Not Found", "message": "Chatflow with id 'xyz' not found." }`)*
* **500 Internal Server Error:**
  * *(Description: An unexpected error occurred on the server. Example: `{ "error": "Internal Server Error", "message": "An unexpected error occurred." }`)*

## Service URLs

* **Primary Service:** `http://localhost:8000`
* **External Auth Service:** `http://localhost:3000`
* **Accounting Service:** `http://localhost:8002`
* **Flowise API:** Configured via `FLOWISE_API_URL` environment variable

This service implements a complete proxy solution with JWT authentication, role-based access control, credit management, and seamless integration with the Flowise AI API.

## Code Architecture & Supporting Files

### Core Application Files

**`app/main.py`** - Main FastAPI application setup and configuration
- Lines 1-35: Application initialization, middleware setup, CORS configuration
- Lines 37-67: Root, health, and info endpoint implementations
- Router includes: `/chat`, `/chatflows` endpoints

**`app/config.py`** - Application configuration and environment variables
- Database connection settings
- JWT configuration parameters
- External service URLs

**`app/database.py`** - Database connection and session management
- MongoDB connection setup
- Database session handling
- Connection pooling configuration

### Authentication & Security

**`app/auth/jwt_handler.py`** - JWT token creation and validation
- Token generation functions
- Token validation and decoding
- Token refresh logic
- Security key management

**`app/auth/middleware.py`** - Authentication middleware
- Request authentication verification
- Token extraction from headers
- User context injection
- Protected route handling

### Service Layer

**`app/services/auth_service.py`** - Authentication business logic
- User authentication workflows
- Password validation
- User session management
- Integration with external auth services

**`app/services/external_auth_service.py`** - External authentication integration
- Third-party authentication providers
- API key validation
- External user verification
- Service-to-service authentication

**`app/services/flowise_service.py`** - Flowise API integration
- Flowise API communication
- Request/response transformation
- Error handling for Flowise calls
- Configuration management

**`app/services/accounting_service.py`** - Credit and billing management
- User credit tracking
- Credit deduction logic
- Billing integration
- Usage analytics

### Data Models

**`app/models/user.py`** - User data model
- User schema definition
- User authentication properties
- Database field mappings

**`app/models/chatflow.py`** - Chatflow data model
- Chatflow schema definition
- Configuration properties
- Access control attributes

**`app/models/refresh_token.py`** - Refresh token data model
- Token storage schema
- Expiration handling
- Token revocation tracking

### API Route Handlers

**`app/api/chat.py`** - Chat-related endpoints

* Lines 32-61: `authenticate()` - User authentication
* Lines 63-93: `refresh()` - Token refresh
* Lines 95-113: `revoke()` - Token revocation
* Lines 115-145: `predict()` - Chat prediction with credit management
* Lines 147-157: `get_credits()` - Credit balance retrieval

**`app/api/chatflows.py`** - Chatflow management endpoints

* Lines 10-22: `list_chatflows()` - List available chatflows
* Lines 24-36: `get_chatflow()` - Get specific chatflow details
* Lines 38-50: `get_chatflow_config()` - Get chatflow configuration

### Development & Testing

**Testing Structure:**
- `tests/` - Internal unit tests
- `tests-external/` - External API integration tests
- `tests-internal/` - Internal system tests

**Key Test Files:**
- `tests/test_refreshToken.py` - Refresh token functionality tests
- `tests/test_validCredentials.py` - Credential validation tests
- `tests-external/test-api-listChatflow.py` - Chatflow listing tests
- `tests-external/test-api-predict.py` - Prediction endpoint tests

**Documentation:**
- `Doc/Objectives.md` - Project objectives and requirements
- `guide/JWT_HS256_SECURITY.md` - JWT security implementation guide
- `guide/MONGODB_MIGRATION.md` - Database migration documentation
- `progress/Blueprint.md` - Development blueprint
- `progress/Progress.md` - Development progress tracking

### Configuration & Deployment

**Docker Configuration:**
- `Dockerfile` - Main application container
- `docker-compose.yml` - Multi-service orchestration
- `docker-compose.test.yml` - Testing environment setup

**Batch Scripts:**
- `start.bat` - Start application locally
- `start-docker.bat` - Start with Docker
- `rebuild-docker.bat` - Rebuild Docker containers
- `verify-docker.bat` - Verify Docker setup

**Dependencies:**
- `requirements.txt` - Python package dependencies

### Database Initialization

**`init-mongo.js/`** - MongoDB initialization scripts
- Database schema setup
- Initial data seeding
- Index creation

**Migration Tools:**
- `guide/mongodb_migration.py` - Database migration utilities
- `guide/validate_hs256_jwt.py` - JWT validation tools

This architecture provides a complete, production-ready proxy service with comprehensive authentication, authorization, credit management, and seamless integration with the Flowise AI platform.
