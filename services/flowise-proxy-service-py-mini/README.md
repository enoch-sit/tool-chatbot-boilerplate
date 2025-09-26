# 🚀 Minimal Flowise Proxy Implementation

A minimal FastAPI backend (port 5000) and HTML frontend (port 5002) for proxying Flowise chat requests with basepath support.

## 📁 Structure

```
flowise-proxy-service-py-mini/
├── backend/
│   ├── .env                    # Environment configuration
│   ├── requirements.txt        # Python dependencies
│   └── main.py                 # FastAPI application
├── frontend/
│   └── index.html             # Simple chat interface
├── frontend_server.py         # Python HTTP server for frontend
├── start-all.bat             # Start both services (Windows)
├── start-backend.sh          # Start backend only (Unix)
├── start-frontend.sh         # Start frontend only (Unix)
├── start-backend.bat         # Start backend only (Windows)
└── start-frontend.bat        # Start frontend only (Windows)
```

## 🔧 Prerequisites

1. **Python 3.7+** installed
2. **Flowise instance** running on `http://localhost:3000`
3. **Chatflow ID** from your Flowise dashboard

## ⚡ Quick Start

### Option 1: Start All Services (Windows)
```bash
# Run both backend and frontend
start-all.bat
```

### Option 2: Manual Start

1. **Install Dependencies:**
```bash
cd backend
pip install -r requirements.txt
```

2. **Start Backend (Port 5000):**
```bash
# Windows
start-backend.bat

# Unix/Linux/Mac
chmod +x start-backend.sh
./start-backend.sh
```

3. **Start Frontend (Port 5002):**
```bash
# Windows
start-frontend.bat

# Unix/Linux/Mac
chmod +x start-frontend.sh
./start-frontend.sh
```

## 🌐 Access Points

- **Frontend UI**: http://localhost:5002
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/docs

## 📋 Configuration

Edit `backend/.env` to customize:

```env
FLOWISE_API_URL=http://localhost:3000
FLOWISE_API_KEY=your_api_key_here
BASE_PATH=/projectproxy
PORT=5000
```

## 🎯 Usage

1. Open http://localhost:5002
2. Enter your **Chatflow ID** (get from Flowise dashboard)
3. Start chatting!

## 🔗 API Endpoints

### POST /projectproxy/chat/stream
Stream chat responses from Flowise.

**Request:**
```json
{
    "question": "Hello, how are you?",
    "chatflow_id": "your-chatflow-id",
    "streaming": true
}
```

**Response:** Server-Sent Events with streaming tokens

## 🛠️ Server Integration

This implementation supports the `/projectproxy` basepath for nginx reverse proxy integration. The backend automatically handles the basepath routing.

## 🐛 Troubleshooting

1. **Backend won't start**: Check if port 5000 is available
2. **Frontend won't start**: Check if port 5002 is available  
3. **No response from chat**: Verify Flowise is running on localhost:3000
4. **CORS errors**: Ensure both services are running with proper CORS headers

## 📝 Notes

- This is a **minimal implementation** for testing and development
- For production, use proper authentication and rate limiting
- The frontend saves Chatflow ID in localStorage for convenience
- Backend includes FastAPI auto-generated documentation at `/docs`