// src/api/auth.ts
import { LoginCredentials, LoginResponse } from 'types/auth';
import { API_BASE_URL } from './config';

/**
 * Authenticates a user against the backend.
 *
 * @param credentials The user's username and password.
 * @returns A promise that resolves with the login response, including access and refresh tokens.
 *
 * @evidence This function implements the client-side logic for the `/api/v1/chat/authenticate`
 * endpoint. This endpoint is used consistently across the Python test scripts to obtain authentication
 * tokens for various users (admin, supervisor, enduser).
 * For example, see the `get_admin_token` function in `progress/quickAddUserToChatflow_02.py`
 * and `get_user_token` in `progress/quickUserAccessListAndChat_03.py`.
 */
export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/chat/authenticate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Authentication failed: ${response.status}`);
  }

  return response.json();
};

/**
 * Refreshes an expired access token using a refresh token.
 *
 * @param token The refresh token.
 * @returns A promise that resolves with a new set of tokens.
 *
 * @evidence While not explicitly tested in the provided Python scripts, the presence of a
 * `refresh_token` in the authentication response implies the existence of a refresh mechanism.
 * This function implements the standard client-side logic for a `/api/v1/chat/refresh` endpoint,
 * which is a best practice for robust authentication.
 */
export const refreshToken = async (token: string): Promise<LoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/chat/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: token }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Token refresh failed: ${response.status}`);
  }

  return response.json();
};