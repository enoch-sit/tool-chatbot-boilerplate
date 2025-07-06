# Progress Log

## Step 1: Initial Setup & First Dependency

Following the differential building strategy. The goal is to make the `interact-bridge-ui` project buildable by incrementally adding its dependencies and code to the `bridge` project.

- **Action:** Installing the first dependency `@emotion/react` into the `bridge` project.
- **Command:** `npm install @emotion/react`

## Step 2: Add @emotion/styled

- **Action:** Installing `@emotion/styled`.
- **Command:** `npm install @emotion/styled`

## Step 3: Add @fontsource/inter

- **Action:** Installing `@fontsource/inter`.
- **Command:** `npm install @fontsource/inter`

## Step 4: Add @lightenna/react-mermaid-diagram

- **Action:** Installing `@lightenna/react-mermaid-diagram`.
- **Command:** `npm install @lightenna/react-mermaid-diagram`

## Step 5: Add @mui/icons-material

- **Action:** Installing `@mui/icons-material`.
- **Command:** `npm install @mui/icons-material`

## Step 6: Add @mui/joy

- **Action:** Installing `@mui/joy`.
- **Command:** `npm install @mui/joy`

## Step 7: Add react-router-dom and Core App Structure

- **Action:** Installing `react-router-dom` for navigation.
- **Command:** `npm install react-router-dom`
- **Action:** Copied core application files: `index.html`, `src/main.tsx`, `src/index.css`, `src/App.tsx`, and `src/assets/react.svg`. This establishes the basic app shell.

## Step 8: Internationalization with i18next

- **Action:** Installing i18next and related packages for internationalization.
- **Command:** `npm install i18next react-i18next i18next-browser-languagedetector i18next-http-backend`
- **Action:** Copied `src/i18n.ts` and locale files.

## Step 9: State Management with Zustand and Debug Feature

- **Action:** Installing `zustand` for state management.
- **Command:** `npm install zustand`
- **Action:** Copied `src/components/debug/DebugLog.tsx` and `src/store/debugStore.ts` to implement the debug mode feature.

## Step 10: Authentication Flow

- **Action:** Installing `jwt-decode` for handling JSON Web Tokens.
- **Command:** `npm install jwt-decode`
- **Action:** Copied authentication-related files: `src/hooks/useAuth.ts`, `src/types/auth.ts`, `src/store/authStore.ts`, and `src/api/auth.ts`.
- **Action:** Copied `src/pages/LoginPage.tsx` and `src/pages/DashboardPage.tsx`.

## Step 11: Layout and Protected Routes

- **Action:** Created directories for layout and auth components.
- **Action:** Copied `src/components/auth/ProtectedRoute.tsx` and `src/components/layout/Layout.tsx`.
- **Action:** Copied `src/components/layout/Header.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/LanguageSelector.tsx`, and `src/components/ThemeToggleButton.tsx`.
- **Action:** Copied `src/hooks/usePermissions.ts`.
- **Action:** Updated `App.tsx` to use the new `Layout` and `ProtectedRoute` components, establishing the main application structure for authenticated users.
- **Build:** Ran `npm run build` and fixed an error in `ProtectedRoute.tsx` where the `Layout` component was being used incorrectly. The build is now successful.

## Step 12: Mixed Content Rendering

- **Action:** Installing `prismjs` and its type definitions for code block syntax highlighting.
- **Command:** `npm install prismjs @types/prismjs`
- **Action:** Installing `react-markdown`, `remark-gfm`, and `rehype-highlight` for markdown rendering.
- **Command:** `npm install react-markdown remark-gfm rehype-highlight`
- **Action:** Installing `mermaid` for diagram rendering.
- **Command:** `npm install mermaid`
- **Action:** Installing `markdown-to-jsx` and `marked`.
- **Command:** `npm install markdown-to-jsx marked`
- **Action:** Copied `src/components/renderers/CodeBlock.tsx`, `src/components/renderers/MermaidDiagram.tsx`, `src/components/renderers/MixedContent.tsx`, `src/utils/contentParser.ts`, and `src/types/chat.ts` to support rendering of complex chat messages.
- **Build:** Ran `npm run build`. The build is successful.

## Step 13: API Client and User Functions

- **Action:** Installing `axios` for making HTTP requests.
- **Command:** `npm install axios`
- **Action:** Copied API-related files: `src/api/client.ts`, `src/api/config.ts`, and `src/api/user.ts`. This sets up the foundation for communicating with the backend.
- **Action:** Installing `@mui/material`.
- **Command:** `npm install @mui/material`
- **Build:** Ran `npm run build`. The build is successful.

## Step 14: Chatflow API and Initial Build Fixes

- **Action:** Copied `src/api/chatflows.ts` and `src/types/chatflow.ts` to fetch chatflow data.
- **Build & Fix:** Ran `npm run build` and encountered several TypeScript errors.
  - `AgentFlowTimeline.tsx`: Removed unused `index` variable.
  - `types/chat.ts`: Added optional `latency` to `timeMetadata` and added `ContentEvent` to the `StreamEvent` union.
  - `MessageList.tsx` & `ChatPage.tsx`: Switched to type-only imports.
  - `ChatPage.tsx`: Fixed `Alert` component usage and removed unused props.
  - `utils/chatParser.ts`: Added missing `id` property to message objects.
  - `utils/streamParser.ts`: Corrected the structure of the dispatched `content` event.
- **Build:** Ran `npm run build` again. The build is now successful.

## Step 15: Final Build Fixes

- **Action:** Installing `uuid` to generate unique IDs for chat messages.
- **Command:** `npm install uuid && npm install @types/uuid --save-dev`
- **Build & Fix:** Ran `npm run build` and fixed the final TypeScript errors.
  - `utils/chatParser.ts`: Ensured that every message created in `mapHistoryToMessages` has a unique `id` by using `uuidv4()`.
  - `components/chat/AgentFlowTimeline.tsx`: Added proper type guards to prevent accessing `event.data` on event types where it does not exist.
- **Build:** Ran `npm run build` again. The build is now successful.

## Step 16: Dependency Installation and Final Build Fix

- **Action:** Installing missing dependencies `graceful-fs` and `@types/uuid`.
- **Command:** `npm install graceful-fs @types/uuid`
- **Build & Fix:** Ran `npm run build` and fixed the final TypeScript error in `MessageBubble.tsx`.
  - `components/chat/MessageBubble.tsx`: Added a type guard to correctly narrow the `StreamEvent` type to `TokenEvent` before accessing the `data` property.
- **Build:** Ran `npm run build` again. The build is now successful.
