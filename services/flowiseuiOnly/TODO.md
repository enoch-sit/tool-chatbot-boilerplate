# TODO: Fix Nginx 500 Error - Static File Serving

## 🎯 Current Issue
- Nginx returns 500 Internal Server Error when accessing `/projectui/`
- Error logs show: `Permission denied` and `internal redirection cycle`

## ✅ Steps to Fix (In Order)

### Step 1: Fix File Permissions
```bash
# Check current permissions
ls -la /home/proj13/flowiseui/dist/

# Fix directory permissions for nginx access
chmod 755 /home/proj13/
chmod 755 /home/proj13/flowiseui/
chmod -R 755 /home/proj13/flowiseui/dist/

# Verify permissions are correct
ls -la /home/proj13/flowiseui/dist/
```

### Step 2: Fix Nginx Configuration - Option A (Recommended)
```bash
# Edit nginx configuration
sudo nano /etc/nginx/sites-available/$HOSTNAME

# Replace the /projectui/ location block with:
location /projectui/ {
    alias /home/proj13/flowiseui/dist/;
    try_files $uri $uri/index.html /projectui/index.html;
    index index.html;
}
```

### Step 3: Test and Reload
```bash
# Test nginx configuration syntax
sudo nginx -t

# If test passes, reload nginx
sudo nginx -s reload

# Test the website
curl -I https://project-1-13.eduhk.hk/projectui/
```

### Step 4: Alternative Config (If Step 2 doesn't work)
```nginx
# Try this simpler configuration:
location /projectui {
    alias /home/proj13/flowiseui/dist;
    try_files $uri $uri/ /index.html;
    index index.html;
}
```

### Step 5: Alternative Config with Named Location (If Step 4 doesn't work)
```nginx
# Try with named location to avoid redirection cycle:
location /projectui/ {
    alias /home/proj13/flowiseui/dist/;
    try_files $uri $uri/ @fallback;
}

location @fallback {
    rewrite ^/projectui/(.*)$ /projectui/index.html last;
}
```

## 🔍 Debugging Commands

### Check Error Logs
```bash
# Monitor error logs in real-time
sudo tail -f /var/log/nginx/error.log

# Check last 20 error lines
sudo tail -20 /var/log/nginx/error.log
```

### Check File Access
```bash
# Test if nginx user can access files
sudo -u www-data ls -la /home/proj13/flowiseui/dist/
sudo -u www-data cat /home/proj13/flowiseui/dist/index.html
```

### Verify Build Files
```bash
# Ensure build files exist and are correct
cd /home/proj13/flowiseui
ls -la dist/
cat dist/index.html | head -10
```

## 🎯 Expected Outcome
- ✅ No more 500 errors
- ✅ Static files served directly by nginx
- ✅ No need for PM2 or preview server
- ✅ Better performance and reliability

## 📝 Notes
- Current approach: Static file serving (no PM2 needed)
- Nginx serves files from: `/home/proj13/flowiseui/dist/`
- Base path configured as: `/projectui/`
- Backend (Flowise) still on port 3000
- Frontend now served as static files instead of port 3002