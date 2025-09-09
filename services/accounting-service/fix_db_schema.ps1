# PowerShell script to remove the foreign key constraint from the credit_allocations table
# This will allow credit allocations to be created without requiring a user account to exist first

Write-Host "Creating database fix script..." -ForegroundColor Cyan

# Create a file to execute SQL
$sqlPatchContent = @"
-- Drop the foreign key constraint
ALTER TABLE credit_allocations 
DROP CONSTRAINT IF EXISTS credit_allocations_user_id_fkey;

-- Inform the user of the changes
SELECT 'Foreign key constraint removed successfully. Credit allocations can now be created for any user ID.' as result;
"@

# Save the SQL to a temporary file
$sqlFilePath = "$env:TEMP\fix_db_schema.sql"
$sqlPatchContent | Out-File -FilePath $sqlFilePath -Encoding UTF8

Write-Host "Copying SQL file to Docker container..." -ForegroundColor Cyan
Get-Content $sqlFilePath | docker exec -i accounting-service-postgres-1 sh -c 'cat > /tmp/fix_db_schema.sql'

Write-Host "Applying database schema fix..." -ForegroundColor Cyan

# Execute the SQL patch against the PostgreSQL database inside Docker
docker exec accounting-service-postgres-1 psql -U postgres -d accounting_db -f /tmp/fix_db_schema.sql

Write-Host "Database schema fix applied successfully!" -ForegroundColor Green