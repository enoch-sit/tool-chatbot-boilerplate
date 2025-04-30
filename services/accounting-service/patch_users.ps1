# PowerShell script to apply a database patch to create or update user accounts in the Accounting service
# It's used to ensure users from Auth service exist in the Accounting database

Write-Host "Creating user account patch script..." -ForegroundColor Cyan

# Create a file to execute SQL
$sqlPatchContent = @"
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

-- Create accounts for any future test users with predictable IDs
-- First set of future test users (01-20)
INSERT INTO user_accounts (user_id, email, username, role, created_at, updated_at)
VALUES 
  ('680f3600fd53771548d9a901', 'future01@example.com', 'futureuser01', 'enduser', NOW(), NOW()),
  ('680f3601fd53771548d9a902', 'future02@example.com', 'futureuser02', 'enduser', NOW(), NOW()),
  ('680f3602fd53771548d9a903', 'future03@example.com', 'futureuser03', 'enduser', NOW(), NOW()),
  ('680f3603fd53771548d9a904', 'future04@example.com', 'futureuser04', 'enduser', NOW(), NOW()),
  ('680f3604fd53771548d9a905', 'future05@example.com', 'futureuser05', 'enduser', NOW(), NOW()),
  ('680f3605fd53771548d9a906', 'future06@example.com', 'futureuser06', 'enduser', NOW(), NOW()),
  ('680f3606fd53771548d9a907', 'future07@example.com', 'futureuser07', 'enduser', NOW(), NOW()),
  ('680f3607fd53771548d9a908', 'future08@example.com', 'futureuser08', 'enduser', NOW(), NOW()),
  ('680f3608fd53771548d9a909', 'future09@example.com', 'futureuser09', 'enduser', NOW(), NOW()),
  ('680f3609fd53771548d9a910', 'future10@example.com', 'futureuser10', 'enduser', NOW(), NOW()),
  ('680f3610fd53771548d9a911', 'future11@example.com', 'futureuser11', 'enduser', NOW(), NOW()),
  ('680f3611fd53771548d9a912', 'future12@example.com', 'futureuser12', 'enduser', NOW(), NOW()),
  ('680f3612fd53771548d9a913', 'future13@example.com', 'futureuser13', 'enduser', NOW(), NOW()),
  ('680f3613fd53771548d9a914', 'future14@example.com', 'futureuser14', 'enduser', NOW(), NOW()),
  ('680f3614fd53771548d9a915', 'future15@example.com', 'futureuser15', 'enduser', NOW(), NOW()),
  ('680f3615fd53771548d9a916', 'future16@example.com', 'futureuser16', 'enduser', NOW(), NOW()),
  ('680f3616fd53771548d9a917', 'future17@example.com', 'futureuser17', 'enduser', NOW(), NOW()),
  ('680f3617fd53771548d9a918', 'future18@example.com', 'futureuser18', 'enduser', NOW(), NOW()),
  ('680f3618fd53771548d9a919', 'future19@example.com', 'futureuser19', 'enduser', NOW(), NOW()),
  ('680f3619fd53771548d9a920', 'future20@example.com', 'futureuser20', 'enduser', NOW(), NOW())
ON CONFLICT (user_id) DO NOTHING;
"@

# Save the SQL to a temporary file
$sqlFilePath = "$env:TEMP\patch_user_accounts.sql"
$sqlPatchContent | Out-File -FilePath $sqlFilePath -Encoding UTF8

Write-Host "Copying SQL file to Docker container..." -ForegroundColor Cyan
Get-Content $sqlFilePath | docker exec -i accounting-service-postgres-1 sh -c 'cat > /tmp/patch_user_accounts.sql'

Write-Host "Applying patch to database..." -ForegroundColor Cyan

# Execute the SQL patch against the PostgreSQL database inside Docker
docker exec accounting-service-postgres-1 psql -U postgres -d accounting_db -f /tmp/patch_user_accounts.sql

Write-Host "Patch applied successfully!" -ForegroundColor Green