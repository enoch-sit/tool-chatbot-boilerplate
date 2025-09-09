# Migration Workflow - Quick Reference

## File Decision Tree

```
Are you using Windows or Linux?
├── Windows Development
│   ├── Do you want DB only in Docker?
│   │   ├── YES → Use `rebuild-docker-dbonly.bat`
│   │   │   ├── Migrations run automatically if you choose "yes"
│   │   │   └── Or run `run-migrations.bat` separately
│   │   └── NO → Use full Docker setup
│   └── Need to run migrations only?
│       └── Use `run-migrations.bat`
│
└── Linux Development
    ├── Full Docker setup → Use `rebuild-docker-test.sh`
    │   └── Migrations run automatically
    ├── Need to run migrations only?
    │   └── Use `run-migrations-docker.sh`
    └── Production deployment
        └── Use `python migrations/run_migrations.py --all`
```

## Your Current Setup (Windows + DB-only Docker)

**You should use**: `rebuild-docker-dbonly.bat`

**Workflow**:
1. Run `rebuild-docker-dbonly.bat`
2. When prompted "Do you want to run database migrations now? (yes/no):" → Type `yes`
3. Start your VS Code debugger with "Python Debugger: FastAPI (Test DB)"

**Files involved**:
- `rebuild-docker-dbonly.bat` (starts MongoDB container + optionally runs migrations)
- `migrations/run_migrations.py` (called by the batch file)
- `migrations/add_metadata_to_chat_messages.py` (the actual migration)

## Quick Command Reference

| What you want to do | Command |
|---------------------|---------|
| Fresh start everything | `rebuild-docker-dbonly.bat` |
| Run migrations only | `run-migrations.bat` |
| Check migration status | `python migrations/add_metadata_to_chat_messages.py --verify` |
| Rollback (careful!) | `python migrations/add_metadata_to_chat_messages.py --rollback` |

## Files You DON'T Need (for your setup)

- `run-migrations-docker.sh` (Linux only)
- `rebuild-docker-test.sh` (Linux only)
- `reset_chat_messages_session_test.py` (test environment reset - different purpose)

## Next Steps

1. Run `rebuild-docker-dbonly.bat`
2. Choose "yes" for migrations
3. Test your `chat_predict_stream_store` endpoint
4. The `metadata` field will now be saved in ChatMessage documents
