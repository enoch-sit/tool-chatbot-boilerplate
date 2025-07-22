# Chatflow Management

The Flowise Proxy Service now includes comprehensive chatflow management capabilities:

## Features

- **Chatflow Synchronization**: Automatically sync chatflows from Flowise to local database
- **Metadata Storage**: Store comprehensive metadata about each chatflow
- **Admin API**: Manage chatflows via the admin API
- **Status Tracking**: Track sync status and errors

## Configuration

Configure chatflow sync behavior with the following environment variables:

```
ENABLE_CHATFLOW_SYNC=true           # Enable/disable automatic sync (default: true)
CHATFLOW_SYNC_INTERVAL_HOURS=0.05      # Sync interval in hours (default: 0.05)
```

## API Endpoints

### Admin API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/chatflows/sync` | POST | Manually trigger chatflow synchronization |
| `/api/admin/chatflows` | GET | List all chatflows |
| `/api/admin/chatflows/stats` | GET | Get chatflow statistics |
| `/api/admin/chatflows/{flowise_id}` | GET | Get specific chatflow details |
| `/api/admin/chatflows/{flowise_id}` | DELETE | Delete a chatflow from local database |

## Initial Setup

To initialize the application and perform the first chatflow sync:

```bash
python -m setup
```

This will:
1. Connect to the database
2. Create necessary indexes
3. Perform the initial chatflow synchronization
