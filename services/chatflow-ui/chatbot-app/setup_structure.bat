@echo off
setlocal

REM Base directory
set BASE_DIR=src

REM Create root src directory
mkdir %BASE_DIR%

REM Create subdirectories
mkdir %BASE_DIR%\api
mkdir %BASE_DIR%\components\auth
mkdir %BASE_DIR%\components\chat
mkdir %BASE_DIR%\components\renderers
mkdir %BASE_DIR%\components\layout
mkdir %BASE_DIR%\hooks
mkdir %BASE_DIR%\locales\en
mkdir %BASE_DIR%\locales\zh-Hant
mkdir %BASE_DIR%\locales\zh-Hans
mkdir %BASE_DIR%\mocks
mkdir %BASE_DIR%\pages
mkdir %BASE_DIR%\store
mkdir %BASE_DIR%\types
mkdir %BASE_DIR%\utils

REM Create empty files using 'type nul >'
echo. > %BASE_DIR%\api\index.ts
echo. > %BASE_DIR%\api\auth.ts
echo. > %BASE_DIR%\api\index.test.ts

echo. > %BASE_DIR%\components\auth\LoginForm.tsx
echo. > %BASE_DIR%\components\auth\ProtectedRoute.tsx
echo. > %BASE_DIR%\components\auth\AuthGuard.tsx

echo. > %BASE_DIR%\components\chat\MessageList.tsx
echo. > %BASE_DIR%\components\chat\ChatInput.tsx
echo. > %BASE_DIR%\components\chat\MessageBubble.tsx

echo. > %BASE_DIR%\components\renderers\CodeBlock.tsx
echo. > %BASE_DIR%\components\renderers\MermaidDiagram.tsx
echo. > %BASE_DIR%\components\renderers\MindMap.tsx

echo. > %BASE_DIR%\components\layout\Header.tsx
echo. > %BASE_DIR%\components\layout\Sidebar.tsx
echo. > %BASE_DIR%\components\layout\Layout.tsx

echo. > %BASE_DIR%\components\ThemeToggleButton.tsx
echo. > %BASE_DIR%\components\LanguageSelector.tsx

echo. > %BASE_DIR%\hooks\useAuth.ts
echo. > %BASE_DIR%\hooks\useLocalStorage.ts
echo. > %BASE_DIR%\hooks\usePermissions.ts

echo. > %BASE_DIR%\locales\en\translation.json
echo. > %BASE_DIR%\locales\zh-Hant\translation.json
echo. > %BASE_DIR%\locales\zh-Hans\translation.json

echo. > %BASE_DIR%\mocks\browser.ts
echo. > %BASE_DIR%\mocks\server.ts
echo. > %BASE_DIR%\mocks\handlers.ts

echo. > %BASE_DIR%\pages\LoginPage.tsx
echo. > %BASE_DIR%\pages\ChatPage.tsx
echo. > %BASE_DIR%\pages\AdminPage.tsx
echo. > %BASE_DIR%\pages\DashboardPage.tsx

echo. > %BASE_DIR%\store\authStore.ts
echo. > %BASE_DIR%\store\chatStore.ts
echo. > %BASE_DIR%\store\adminStore.ts
echo. > %BASE_DIR%\store\index.ts

echo. > %BASE_DIR%\types\auth.ts
echo. > %BASE_DIR%\types\chat.ts
echo. > %BASE_DIR%\types\api.ts

echo. > %BASE_DIR%\utils\auth.ts
echo. > %BASE_DIR%\utils\storage.ts
echo. > %BASE_DIR%\utils\permissions.ts

echo. > %BASE_DIR%\App.tsx
echo. > %BASE_DIR%\index.tsx
echo. > %BASE_DIR%\i18n.ts

echo Folder structure created