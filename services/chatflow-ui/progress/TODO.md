
# TODO List for Chatbot UI

This document outlines the missing implementations and necessary corrections for the chatbot UI based on the design document.

## Missing Implementations

### 1. Admin API Client (`src/api/admin.ts`)
A new file is required to handle all API calls related to the admin panel.

- [ ] `syncChatflows`: `POST /api/v1/admin/chatflows/sync`
- [ ] `getChatflowStats`: `GET /api/v1/admin/chatflows/stats`
- [ ] `getChatflowDetails`: `GET /api/v1/admin/chatflows/{flowise_id}`
- [ ] `listChatflowUsers`: `GET /api/v1/admin/chatflows/{flowise_id}/users`
- [ ] `addUserToChatflow`: `POST /api/v1/admin/chatflows/{flowise_id}/users`
- [ ] `removeUserFromChatflow`: `DELETE /api/v1/admin/chatflows/{flowise_id}/users`
- [ ] `bulkAddUsersToChatflow`: `POST /api/v1/admin/chatflows/{flowise_id}/users/bulk-add`

### 2. User Credits API
The function to fetch user credits is missing.

- [ ] `getUserCredits`: `GET /api/v1/users/me/credits` in `src/api/index.ts` (or a new `user.ts`).

### 3. Admin State Management (`src/store/adminStore.ts`)
A new Zustand store is needed to manage admin-related data.

- [ ] State for list of chatflows.
- [ ] State for chatflow statistics.
- [ ] State for users of a specific chatflow.
- [ ] Actions to fetch and update this data.

### 4. Admin Pages and Components
The entire UI for the admin section needs to be created.

- [ ] `AdminPage.tsx`: A new page to house the admin dashboard.
- [ ] Components for listing chatflows.
- [ ] Components for displaying chatflow details and statistics.
- [ ] Components for managing users (list, add, remove).

## Corrections

### 1. `api/auth.ts`
The functions in this file do not align with the `design.md`.

- [ ] Remove `logout` function or find the correct endpoint if it exists.
- [ ] Remove `refreshToken` function.
- [ ] Remove `getCurrentUser` function. The user object should be returned from the `login` call and stored.

### 2. `components/auth/AuthGuard.tsx`
This component relies on the incorrect `getCurrentUser` function.

- [ ] Modify `AuthGuard` to rely on the user object stored in `useAuth` after login, instead of re-fetching it.

