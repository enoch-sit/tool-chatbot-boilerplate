import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    // Add rules here if needed
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      "@typescript-eslint/no-explicit-any": "off", // Allow 'any' type for flexibility in development
      'react-hooks/rules-of-hooks': 'error', // Ensure hooks are used correctly
      'react-hooks/exhaustive-deps': 'warn', // Warn about missing dependencies in hooks
      'react-refresh/only-export-components': 'warn', // Ensure components are exported for hot reloading
    },
  },
])
