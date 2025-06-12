# Chatflows API Documentation

## 1. Overview

This document provides detailed information about the Chatflows API endpoints for the Flowise Proxy Service. These endpoints are used by authenticated users to interact with chatflows they have access to.

**Base Path**: All Chatflows API endpoints are prefixed with `/api/v1/chatflows`.

**Authentication**: All endpoints require a valid JWT (JSON Web Token) Bearer token to be included in the `Authorization` header of the request.
Example: `Authorization: Bearer <your_jwt_token>`

## 2. API Endpoints

---

### List Accessible Chatflows

* **Endpoint**: `GET /api/v1/chatflows/`
* **Description**: Retrieves a list of chatflows that the currently authenticated user has permission to access. The list is filtered based on user permissions.
* **Authentication**: JWT Bearer token required.
* **Request Body**: None.
* **Success Response** (`200 OK`): `List[Dict]`
  A list of chatflow objects. Each object typically contains details like `id`, `name`, etc.

  ```json
  [
    {
      "id": "chatflow_id_1",
      "name": "Support Bot",
      // ... other chatflow properties
    },
    {
      "id": "chatflow_id_2",
      "name": "FAQ Assistant",
      // ... other chatflow properties
    }
  ]
  ```

* **Error Responses**:
  * `401 Unauthorized`: If the JWT is invalid or expired.
  * `500 Internal Server Error`: If an unexpected error occurs while retrieving chatflows.
  * `503 Service Unavailable`: If the Flowise service is unavailable.

---

### Get Specific Chatflow Details

* **Endpoint**: `GET /api/v1/chatflows/{chatflow_id}`
* **Description**: Retrieves detailed information for a specific chatflow, provided the authenticated user has access to it.
* **Authentication**: JWT Bearer token required.
* **Path Parameters**:
  * `chatflow_id` (string, required): The ID of the chatflow to retrieve.
* **Request Body**: None.
* **Success Response** (`200 OK`): `Dict`
  A chatflow object containing details like `id`, `name`, etc.

  ```json
  {
    "id": "chatflow_id_1",
    "name": "Support Bot",
    // ... other chatflow properties
  }
  ```

* **Error Responses**:
  * `401 Unauthorized`: If the JWT is invalid or expired.
  * `403 Forbidden`: If the user does not have permission to access the specified chatflow.
  * `404 Not Found`: If the chatflow with the given ID does not exist.
  * `500 Internal Server Error`: If an unexpected error occurs.

---

### Get Chatflow Configuration

* **Endpoint**: `GET /api/v1/chatflows/{chatflow_id}/config`
* **Description**: Retrieves the configuration for a specific chatflow, provided the authenticated user has access to it.
* **Authentication**: JWT Bearer token required.
* **Path Parameters**:
  * `chatflow_id` (string, required): The ID of the chatflow whose configuration is to be retrieved.
* **Request Body**: None.
* **Success Response** (`200 OK`): `Dict`
  An object representing the chatflow's configuration.

  ```json
  {
    // Configuration details specific to the chatflow
    "setting1": "value1",
    "nodes": [],
    // ... other configuration properties
  }
  ```

* **Error Responses**:
  * `401 Unauthorized`: If the JWT is invalid or expired.
  * `403 Forbidden`: If the user does not have permission to access the specified chatflow.
  * `404 Not Found`: If the chatflow configuration for the given ID does not exist or the chatflow itself is not found.
  * `500 Internal Server Error`: If an unexpected error occurs.

---
