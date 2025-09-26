# 🚀 Nginx Integration Guide

## 📋 Current Setup
- **Flowise**: Running on `localhost:3000` → Accessible at `https://project-1-13/`
- **New Proxy Frontend**: Will run on `localhost:5002` → Accessible at `https://project-1-13/projectproxy/`  
- **New Proxy API**: Will run on `localhost:5000` → API at `https://project-1-13/projectproxy/chat/`

## 🔧 Step 1: Update Nginx Configuration

### Option A: Add to Existing Config
Edit your current nginx config file:
```bash
sudo nano /etc/nginx/sites-available/project-1-13
```

Add these location blocks **BEFORE** the root `location /` block:
```nginx
# Minimal Flowise Proxy Frontend (Port 5002)
location /projectproxy/ {
    proxy_pass http://localhost:5002/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    location /projectproxy {
        return 301 /projectproxy/;
    }
}

# Minimal Flowise Proxy API (Port 5000)
location /projectproxy/chat/ {
    proxy_pass http://localhost:5000/projectproxy/chat/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Enable streaming for Server-Sent Events
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 300s;
    
    # Handle CORS
    add_header Access-Control-Allow-Origin '*' always;
    add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
    add_header Access-Control-Allow-Headers 'Content-Type, Authorization' always;
    
    if ($request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin '*';
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
        add_header Access-Control-Allow-Headers 'Content-Type, Authorization';
        add_header Content-Length 0;
        add_header Content-Type 'text/plain';
        return 204;
    }
}

# Optional: API Documentation
location /projectproxy/docs {
    proxy_pass http://localhost:5000/docs;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Option B: Replace Complete Config
Use the complete config file provided in `nginx-complete-config.conf`

## 🔄 Step 2: Test and Reload Nginx

1. **Test Configuration:**
```bash
sudo nginx -t
```

2. **Reload Nginx:**
```bash
sudo systemctl reload nginx
```

## 🚀 Step 3: Start Your Services

1. **Upload Files to Server:**
```bash
# Copy the flowise-proxy-service-py-mini folder to your server
scp -r flowise-proxy-service-py-mini/ proj13@project-1-13:~/
```

2. **Install Dependencies:**
```bash
cd ~/flowise-proxy-service-py-mini/backend
pip install -r requirements.txt
```

3. **Start Services:**
```bash
# Option A: Start both at once
chmod +x start-all.sh
./start-all.sh

# Option B: Start individually
# Backend (Terminal 1)
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 5000

# Frontend (Terminal 2)  
python frontend_server.py
```

## 🌐 Access Points

After setup, you'll have:

### Main Flowise (Existing)
- **URL**: `https://project-1-13/`
- **Purpose**: Your original Flowise instance

### Minimal Proxy Chat Interface (New)
- **URL**: `https://project-1-13/projectproxy/`
- **Purpose**: Simple chat interface for testing
- **Features**: Clean UI, streaming responses, chatflow ID configuration

### Proxy API (New)
- **URL**: `https://project-1-13/projectproxy/chat/stream`  
- **Purpose**: API endpoint for chat requests
- **Docs**: `https://project-1-13/projectproxy/docs`

## 🔧 Configuration

The services are configured with:
- **Basepath**: `/projectproxy` (matches nginx routing)
- **Flowise Connection**: `http://localhost:3000`
- **CORS**: Enabled for cross-origin requests
- **Streaming**: Server-Sent Events for real-time responses

## 🐛 Troubleshooting

1. **502 Bad Gateway**: Check if services are running on ports 5000 and 5002
2. **CORS Errors**: Verify nginx CORS headers are properly configured
3. **No Response**: Ensure Flowise is running on localhost:3000
4. **Permission Denied**: Check file permissions and user access

## 📝 Testing

1. Visit `https://project-1-13/projectproxy/`
2. Enter your Chatflow ID from Flowise dashboard
3. Send a test message
4. Verify streaming response works

This setup allows you to have both your original Flowise instance and the minimal proxy running simultaneously!