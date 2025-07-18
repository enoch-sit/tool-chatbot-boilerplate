# Image Rendering Migration and Deployment Guide

This guide explains how to deploy the image rendering functionality to your production server using the provided migration and deployment scripts.

## Overview

The image rendering functionality adds the following features to your chat system:
- Enhanced chat history API with file metadata
- Thumbnail generation for images (any format)
- Multiple thumbnail sizes (100px, 200px, 300px)
- Optimized file serving with caching
- Support for all major image formats (JPEG, PNG, GIF, WebP, TIFF, etc.)

## Files Included

### 1. Migration Script
- **File**: `migrations/add_image_rendering_support.py`
- **Purpose**: Handles database schema updates and data migration
- **Features**:
  - Backs up existing data
  - Updates database schema
  - Links existing files to messages
  - Creates necessary indexes
  - Tests new functionality

### 2. Deployment Script
- **File**: `deploy_image_rendering.py`
- **Purpose**: Handles complete deployment process
- **Features**:
  - Environment validation
  - Code backup
  - Dependency installation
  - API code updates
  - Database migration
  - Server restart

### 3. Test Script
- **File**: `test_image_rendering.py`
- **Purpose**: Validates the deployment
- **Features**:
  - Tests image upload
  - Tests chat history with file metadata
  - Tests file serving endpoints
  - Tests thumbnail generation

## Prerequisites

Before running the migration, ensure you have:

1. **Python Environment**:
   ```bash
   python --version  # Should be 3.8+
   ```

2. **Virtual Environment** (recommended):
   ```bash
   source venv/bin/activate  # Linux/Mac
   # or
   venv\Scripts\activate     # Windows
   ```

3. **Database Access**:
   - MongoDB connection string configured
   - Database backup (recommended)

4. **Dependencies**:
   ```bash
   pip install Pillow>=10.0.0
   ```

## Step-by-Step Deployment

### Step 1: Pre-deployment Preparation

1. **Stop the server** (if running):
   ```bash
   # Method depends on your setup
   systemctl stop flowise-proxy
   # or
   pkill -f "python.*main.py"
   ```

2. **Create a full backup**:
   ```bash
   # Database backup
   mongodump --uri="your_mongodb_uri" --out=backup_$(date +%Y%m%d)
   
   # Code backup
   tar -czf code_backup_$(date +%Y%m%d).tar.gz app/ requirements.txt
   ```

### Step 2: Run the Migration (Database Only)

If you only need to update the database:

```bash
cd /path/to/your/project
python migrations/add_image_rendering_support.py
```

**What this does**:
- ✅ Checks prerequisites
- 💾 Creates data backup
- 🗃️ Updates database schema
- 🔄 Migrates existing data
- 🔗 Links files to messages
- 📇 Creates indexes
- 🧪 Tests functionality

### Step 3: Full Deployment (Recommended)

For a complete deployment including code updates:

```bash
cd /path/to/your/project
python deploy_image_rendering.py
```

**Options**:
- `--dry-run`: Preview changes without applying them
- `--skip-backup`: Skip code backup
- `--skip-restart`: Skip server restart

**Example dry run**:
```bash
python deploy_image_rendering.py --dry-run
```

### Step 4: Verify Deployment

After deployment, test the functionality:

```bash
python test_image_rendering.py
```

**For remote servers**:
```bash
python test_image_rendering.py --base-url http://your-server.com
```

## API Changes

### New Endpoints

1. **Enhanced Chat History**:
   ```
   GET /api/v1/chat/sessions/{session_id}/history
   ```
   Now includes file metadata in the response.

2. **File Serving**:
   ```
   GET /api/v1/chat/files/{file_id}
   GET /api/v1/chat/files/{file_id}?download=true
   ```

3. **Thumbnail Generation**:
   ```
   GET /api/v1/chat/files/{file_id}/thumbnail
   GET /api/v1/chat/files/{file_id}/thumbnail?size=300
   ```

### Response Format Changes

**Chat History Response** (Enhanced):
```json
{
  "history": [
    {
      "id": "message_id",
      "role": "user",
      "content": "Can you describe this image?",
      "uploads": [
        {
          "file_id": "6877691ec45ce76d3272e5ed",
          "name": "test_image.png",
          "mime": "image/png",
          "size": 1024,
          "is_image": true,
          "url": "/api/v1/chat/files/6877691ec45ce76d3272e5ed",
          "download_url": "/api/v1/chat/files/6877691ec45ce76d3272e5ed?download=true",
          "thumbnail_url": "/api/v1/chat/files/6877691ec45ce76d3272e5ed/thumbnail",
          "thumbnail_small": "/api/v1/chat/files/6877691ec45ce76d3272e5ed/thumbnail?size=100",
          "thumbnail_medium": "/api/v1/chat/files/6877691ec45ce76d3272e5ed/thumbnail?size=300"
        }
      ]
    }
  ]
}
```

## Frontend Integration

### HTML Example
```html
<!-- Display image thumbnail -->
<img src="/api/v1/chat/files/FILE_ID/thumbnail" 
     style="max-width: 200px; cursor: pointer;"
     onclick="window.open('/api/v1/chat/files/FILE_ID', '_blank')">

<!-- Download link -->
<a href="/api/v1/chat/files/FILE_ID?download=true" download>Download Image</a>
```

### JavaScript Example
```javascript
// Render chat history with images
history.forEach(message => {
  if (message.uploads && message.uploads.length > 0) {
    message.uploads.forEach(upload => {
      if (upload.is_image) {
        const img = document.createElement('img');
        img.src = upload.thumbnail_url;
        img.style.maxWidth = '200px';
        img.onclick = () => window.open(upload.url, '_blank');
        
        // Add to chat display
        chatContainer.appendChild(img);
      }
    });
  }
});
```

## Troubleshooting

### Common Issues

1. **PIL Import Error**:
   ```bash
   pip install Pillow>=10.0.0
   ```

2. **Database Connection Issues**:
   - Check MongoDB URI in settings
   - Verify database permissions
   - Ensure database is running

3. **Migration Fails**:
   - Check logs for specific errors
   - Verify backup was created
   - Restore from backup if needed

4. **Server Won't Start**:
   - Check for syntax errors in updated code
   - Verify all dependencies are installed
   - Check server logs

### Rollback Procedure

If deployment fails:

1. **Restore Code**:
   ```bash
   # Code backup is in backups/ directory
   cp -r backups/pre_image_rendering_*/app/ ./
   ```

2. **Restore Database**:
   ```bash
   # Database backup collections have timestamp suffix
   # Use MongoDB tools to restore from backup collections
   ```

3. **Restart Server**:
   ```bash
   systemctl restart flowise-proxy
   ```

### Log Files

Monitor these logs during deployment:
- Application logs: Check your app's log files
- Database logs: MongoDB logs
- System logs: `/var/log/syslog` or similar

## Performance Considerations

1. **Thumbnail Caching**:
   - Thumbnails are cached for 24 hours
   - Full images cached for 1 hour
   - Consider CDN for production

2. **Database Indexes**:
   - Migration creates optimized indexes
   - Monitor query performance

3. **File Storage**:
   - GridFS is used for file storage
   - Consider file size limits
   - Monitor disk usage

## Security Notes

1. **File Access Control**:
   - Files are user-scoped
   - JWT authentication required
   - No public file access

2. **File Type Validation**:
   - MIME type checking
   - File size limits
   - Malicious file detection

3. **Thumbnail Generation**:
   - PIL handles image validation
   - Safe image processing
   - Resource limits applied

## Support

If you encounter issues:

1. Check the troubleshooting section
2. Review log files
3. Run tests to identify specific problems
4. Create backups before any fixes

---

**Note**: Always test in a staging environment before deploying to production!
