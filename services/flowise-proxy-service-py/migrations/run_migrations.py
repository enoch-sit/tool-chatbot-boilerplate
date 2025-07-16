"""
Migration runner for production deployments
"""

import asyncio
import sys
import os
from datetime import datetime
import importlib.util

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class MigrationRunner:
    def __init__(self, migrations_dir="migrations"):
        self.migrations_dir = migrations_dir
        self.migration_history = []
    
    async def run_migration(self, migration_name):
        """Run a specific migration"""
        migration_path = os.path.join(self.migrations_dir, f"{migration_name}.py")
        
        if not os.path.exists(migration_path):
            print(f"❌ Migration file not found: {migration_path}")
            return False
        
        try:
            # Load the migration module
            spec = importlib.util.spec_from_file_location(migration_name, migration_path)
            migration_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(migration_module)
            
            # Look for the main migration function
            if hasattr(migration_module, 'migrate_add_metadata_field'):
                print(f"🚀 Running migration: {migration_name}")
                await migration_module.migrate_add_metadata_field()
                print(f"✅ Migration completed: {migration_name}")
                return True
            else:
                print(f"❌ Migration function not found in {migration_name}")
                return False
                
        except Exception as e:
            print(f"❌ Migration failed: {migration_name} - {str(e)}")
            return False
    
    async def run_all_pending_migrations(self):
        """Run all pending migrations"""
        print("🔄 Starting migration runner...")
        
        # List of migrations to run (in order)
        migrations = [
            "add_metadata_to_chat_messages"
        ]
        
        for migration in migrations:
            success = await self.run_migration(migration)
            if not success:
                print(f"❌ Migration pipeline stopped at: {migration}")
                return False
        
        print("✅ All migrations completed successfully!")
        return True

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Run database migrations')
    parser.add_argument('--migration', type=str, help='Run a specific migration')
    parser.add_argument('--all', action='store_true', help='Run all pending migrations')
    args = parser.parse_args()
    
    runner = MigrationRunner()
    
    if args.migration:
        asyncio.run(runner.run_migration(args.migration))
    elif args.all:
        asyncio.run(runner.run_all_pending_migrations())
    else:
        print("Please specify --migration <name> or --all")
        print("Available migrations:")
        print("  - add_metadata_to_chat_messages")
