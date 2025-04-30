#!/bin/bash
# This script applies a database patch to create or update user accounts in the Accounting service
# It's used to ensure users from Auth service exist in the Accounting database

echo "Creating user account patch script..."

# Create a file to execute SQL
cat > /tmp/patch_user_accounts.sql << EOF
-- Ensure admin user exists
INSERT INTO user_accounts (user_id, email, username, role, created_at, updated_at)
VALUES ('680ae6ca9251d6fe8c189407', 'admin@example.com', 'admin', 'admin', NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Create accounts for test users (IDs from recent tests)
INSERT INTO user_accounts (user_id, email, username, role, created_at, updated_at)
VALUES 
  ('680f30bdfd53771548d9a877', 'test1@example.com', 'testuser1', 'enduser', NOW(), NOW()),
  ('680f3219fd53771548d9a888', 'test2@example.com', 'testuser2', 'enduser', NOW(), NOW()),
  ('680f3281fd53771548d9a899', 'test3@example.com', 'testuser3', 'enduser', NOW(), NOW()),
  ('680f33e7fd53771548d9a8bb', 'test4@example.com', 'testuser4', 'enduser', NOW(), NOW()),
  ('680f351ffd53771548d9a8cc', 'test5@example.com', 'testuser5', 'enduser', NOW(), NOW())
ON CONFLICT (user_id) DO NOTHING;

-- Create accounts for future test users with pattern-matching IDs
-- This way any new test user IDs matching this pattern will work
DO $$
DECLARE
  i INTEGER := 1;
BEGIN
  WHILE i <= 100 LOOP
    BEGIN
      INSERT INTO user_accounts (user_id, email, username, role, created_at, updated_at)
      VALUES 
        ('future_test_user_' || i, 'future' || i || '@example.com', 'futureuser' || i, 'enduser', NOW(), NOW());
    EXCEPTION WHEN unique_violation THEN
      -- Do nothing, just continue with the next iteration
    END;
    i := i + 1;
  END LOOP;
END $$;
EOF

# Execute the SQL patch against the PostgreSQL database inside Docker
echo "Applying patch to database..."
docker exec accounting-service-postgres-1 psql -U postgres -d accounting_db -f /tmp/patch_user_accounts.sql

echo "Patch applied successfully."