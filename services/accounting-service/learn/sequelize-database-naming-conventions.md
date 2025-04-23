# Understanding Sequelize Column Naming Conventions and Docker Configuration Issues

This document explains two common issues we encountered in our application and how we fixed them. These issues are particularly relevant for beginners working with TypeScript, Sequelize ORM, and Docker.

## Issue 1: Docker Path Configuration for TypeScript Projects

### The Problem

In our accounting service, we encountered an issue where Docker couldn't find the correct JavaScript file to run. This happened because:

1. We wrote our code in TypeScript (`.ts` files)
2. TypeScript compiles to JavaScript (`.js` files) in a `dist` directory
3. Our Docker configuration was pointing to the wrong path for the compiled JavaScript files

### The Solution

We updated the `Dockerfile` to use the correct path for the compiled JavaScript file:

```dockerfile
# Before:
CMD ["node", "src/server.js"]

# After:
CMD ["node", "dist/src/server.js"]
```

This ensures that Docker looks for the compiled JavaScript file in the correct location.

### What to Learn from This

When working with TypeScript and Docker:
- Always make sure your Docker configuration points to the **compiled** JavaScript files, not the TypeScript source files
- Understand your project's build process and the location where compiled files are output
- Double-check paths in your Dockerfile to ensure they match your project's structure

## Issue 2: Sequelize Column Naming Conventions and Foreign Keys

### The Problem

We encountered database errors related to column naming conventions:

```
error: column "userId" referenced in foreign key constraint does not exist
```

The issue occurred because:
1. In our Sequelize configuration, we set `underscored: true`, which converts camelCase field names to snake_case in the database
2. In our model definitions, we were still referencing foreign keys using camelCase (e.g., `'userId'` instead of `'user_id'`)

### The Solution

We had to update all references to column names in foreign keys and indexes to use the correct snake_case format:

```typescript
// Before:
references: {
  model: 'user_accounts',
  key: 'userId'  // Incorrect - doesn't match actual DB column name
}

// After:
references: {
  model: 'user_accounts',
  key: 'user_id'  // Correct - matches actual DB column name
}
```

And similarly for index definitions:

```typescript
// Before:
indexes: [
  {
    name: 'idx_credit_user_expiry',
    fields: ['userId', 'expiresAt']  // Incorrect
  }
]

// After:
indexes: [
  {
    name: 'idx_credit_user_expiry',
    fields: ['user_id', 'expires_at']  // Correct
  }
]
```

### What to Learn from This

When working with Sequelize:
1. **Understand naming conventions**: 
   - `underscored: true` in Sequelize configuration means all camelCase names will be converted to snake_case in the database
   - For example, `userId` becomes `user_id`, `createdAt` becomes `created_at`

2. **Be consistent with column references**:
   - When defining foreign keys, use the column name as it exists in the database (snake_case if `underscored: true`)
   - Same applies for index definitions - use the actual database column names

3. **Check the actual database schema**:
   - When debugging, check the actual column names in your database tables
   - Error messages like `column "X" referenced in foreign key constraint does not exist` are clues that your references don't match the actual column names

## Best Practices

1. **Be explicit about naming conventions**: If you use `underscored: true`, be consistent across your entire application

2. **Document your conventions**: Make it clear in your project documentation which naming convention is used for database columns

3. **Test database migrations**: Test your database migrations in a non-production environment to catch these issues early

4. **Examine error messages carefully**: Database errors often contain valuable information about what went wrong, including the exact SQL that failed

These issues are common when working with ORMs like Sequelize, especially in TypeScript projects running in Docker containers. Understanding these concepts will help you avoid similar problems in the future.