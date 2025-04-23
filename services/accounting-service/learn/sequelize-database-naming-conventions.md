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

## Where to Configure Sequelize Settings

Understanding where to set Sequelize configuration is crucial for managing database behavior consistently across your application.

### Main Configuration Location

In our project, Sequelize is configured in the `src/config/sequelize.ts` file:

```typescript
// src/config/sequelize.ts
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Sequelize instance with PostgreSQL
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'accounting_db',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true  // This is where we set column naming convention to snake_case
  }
});

export default sequelize;
```

### Key Configuration Options

1. **Global Model Settings**: The `define` object in the configuration applies settings to all models:
   - `timestamps: true` - Automatically adds `created_at` and `updated_at` columns
   - `underscored: true` - Converts camelCase attributes to snake_case in the database

2. **Per-Model Configuration**: You can also override global settings in individual model definitions:

```typescript
YourModel.init({
  // attribute definitions...
}, {
  sequelize,
  tableName: 'your_table',
  timestamps: false,  // Override global timestamp setting
  underscored: false, // Override global underscored setting
  // other model options...
});
```

### Model-Level vs. Global Configuration

When deciding where to set configuration options:

- **Global Configuration** (in `sequelize.ts`):
  - Use for consistent settings across all models
  - Good for application-wide conventions like naming standards

- **Model-Level Configuration** (in individual model files):
  - Use for exceptions to global rules
  - Specific behavior needed for particular tables

### Important: Consistency is Key

The most critical aspect is **consistency**. If you set `underscored: true` globally:

1. All your model definitions should use camelCase for attribute names in TypeScript
2. All foreign key references should use snake_case for the column names in the database
3. All database operations should be aware of this transformation

### Configuration Hierarchy

Configuration is applied in this order:
1. Sequelize default settings
2. Global settings in your Sequelize instance
3. Model-specific settings in `.init()` calls

Later settings override earlier ones, so model-specific settings take precedence over global settings.

## Best Practices

1. **Be explicit about naming conventions**: If you use `underscored: true`, be consistent across your entire application

2. **Document your conventions**: Make it clear in your project documentation which naming convention is used for database columns

3. **Test database migrations**: Test your database migrations in a non-production environment to catch these issues early

4. **Examine error messages carefully**: Database errors often contain valuable information about what went wrong, including the exact SQL that failed

5. **Keep configuration centralized**: Maintain your main Sequelize configuration in one location for easier maintenance

6. **Document any exceptions**: If specific models don't follow your global configuration, document why they're different

By understanding where and how to configure Sequelize, you can avoid inconsistencies that lead to database errors and make your codebase more maintainable.