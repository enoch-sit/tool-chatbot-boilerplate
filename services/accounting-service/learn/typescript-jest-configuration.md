# TypeScript and Jest Configuration Guide

## Overview

This document explains how we fixed the TypeScript error "Cannot find name 'jest'" (ts(2304)) in our project. This error occurs when TypeScript doesn't recognize Jest globals like `jest`, `describe`, `it`, etc., even though Jest is installed in the project.

## Problem

TypeScript was showing the error:
```
Cannot find name 'jest'. ts(2304)
```

This was happening because:

1. Even though Jest and its TypeScript types (`@types/jest`) were installed, TypeScript wasn't configured to recognize these types
2. Our test files were being excluded from TypeScript's type checking with `"exclude": ["**/*.test.ts"]` in tsconfig.json

## Solution

We fixed this by updating the TypeScript configuration (tsconfig.json) with the following changes:

1. Added Jest to the types array in compilerOptions
2. Changed the rootDir from "./src" to "./" to properly include all project files
3. Updated the include array to also look for test files
4. Removed "**/*.test.ts" from the exclude array

### Before

```json
{
  "compilerOptions": {
    "target": "es2018",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.test.ts"]
}
```

### After

```json
{
  "compilerOptions": {
    "target": "es2018",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "types": ["node", "jest"]
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules"]
}
```

## Key Points to Remember

1. When using Jest with TypeScript, always include `"jest"` in the `"types"` array in tsconfig.json
2. Make sure your test files are not excluded from TypeScript's type checking
3. The rootDir should accommodate all files that need to be included in the compilation process
4. Always run type checking on your tests to catch issues early

## Additional Notes

- These changes don't affect how your tests run or how your application works
- They only ensure that TypeScript properly understands and validates your test files
- Your Jest tests should now run without any TypeScript errors