# 🚀 Deployment Guide: Frontend Image Display Fix

## Overview

This guide explains how the image display issue has been resolved and how the solution works in both development and production environments.

## 🔧 Problem Summary

**Issue**: Frontend was getting HTML content (Vite dev server) instead of image files from `/api/v1/chat/files/{file_id}` endpoints.

**Root Cause**: Missing proxy configuration in Vite development server.

**Test Results**: ✅ Backend API endpoints work perfectly - all file retrieval endpoints return correct image data.

## ✅ Solution Applied

### 1. **Vite Configuration Updates**

Updated `vite.config.ts` with:

- Environment-based configuration
- Development proxy setup
- Production build optimization
- Proper environment variable handling

### 2. **Environment Variable Support**

The configuration now properly uses:

- `.env` - Default (localhost:8000)
- `.env.development` - Development (localhost:8000)  
- `.env.production` - Production (<https://aai02.eduhk.hk>)

## 🏗️ How It Works

### **Development Mode** (`npm run dev`)

```
Frontend Request: /api/v1/chat/files/{file_id}
       ↓
Vite Proxy: Intercepts /api/* requests  
       ↓
Backend API: http://localhost:8000/api/v1/chat/files/{file_id}
       ↓
Response: Binary image data ✅
```

**Configuration:**

- Proxy automatically routes `/api/*` to backend
- No CORS issues
- Real-time debugging logs
- Hot reload works perfectly

### **Production Mode** (`npm run build`)

```
Frontend Request: /api/v1/chat/files/{file_id}
       ↓
Direct API Call: https://aai02.eduhk.hk/api/v1/chat/files/{file_id}
       ↓
Response: Binary image data ✅
```

**Configuration:**

- No proxy needed
- Direct API calls to production backend
- Environment variables baked into build
- CORS must be configured on backend

## 📁 File Changes Made

### `vite.config.ts`

```typescript
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_FLOWISE_PROXY_API_URL || 'http://localhost:8000'
  
  // Development: Add proxy configuration
  if (mode === 'development') {
    return {
      // ... base config
      server: {
        proxy: {
          '/api': {
            target: proxyTarget,
            changeOrigin: true,
            secure: false,
            ws: true,
          }
        }
      }
    };
  }
  
  // Production: No proxy needed
  return baseConfig;
});
```

### Environment Files

- `.env` - `VITE_FLOWISE_PROXY_API_URL=http://localhost:8000`
- `.env.development` - `VITE_FLOWISE_PROXY_API_URL=http://localhost:8000`
- `.env.production` - `VITE_FLOWISE_PROXY_API_URL=https://aai02.eduhk.hk`

### API Configuration (`src/api/config.ts`)

```typescript
export const API_BASE_URL = import.meta.env.VITE_FLOWISE_PROXY_API_URL || 'http://localhost:8000';
```

## 🚀 Deployment Instructions

### **Development**

1. Ensure backend is running on `localhost:8000`
2. Run frontend: `npm run dev`
3. Images should now display correctly ✅

### **Production Build**

1. Set production environment: `VITE_FLOWISE_PROXY_API_URL=https://aai02.eduhk.hk`
2. Build: `npm run build`
3. Deploy build artifacts
4. Ensure backend CORS allows frontend domain

### **Production Server Requirements**

**Option 1: Same Domain Deployment**

```
https://yourdomain.com/          → Frontend static files
https://yourdomain.com/api/      → Backend API
```

**Option 2: Different Domain (requires CORS)**

```
https://frontend.yourdomain.com/ → Frontend
https://api.yourdomain.com/      → Backend API
```

Backend must allow CORS for frontend domain:

```python
CORS_ORIGIN = "https://frontend.yourdomain.com"
```

## 🔍 Verification Steps

### **Development Testing**

1. Start backend: Backend running on port 8000
2. Start frontend: `npm run dev`
3. Upload image in chat
4. Check browser console for proxy logs:

   ```
   📤 Sending Request to Target: GET /api/v1/chat/files/{file_id} → http://localhost:8000
   📥 Received Response from Target: 200 /api/v1/chat/files/{file_id}
   ```

5. Images should display correctly

### **Production Testing**

1. Build: `npm run build`
2. Serve build: `npm run preview` or deploy to server
3. Check network tab: Requests should go directly to production API
4. Verify CORS headers in response
5. Images should display correctly

## 🛠️ Troubleshooting

### **Development Issues**

**Problem**: Still getting HTML responses
**Solution**:

- Restart dev server after config changes
- Check console for proxy target logs
- Verify backend is running on correct port

**Problem**: Proxy errors
**Solution**:

- Check backend health: `curl http://localhost:8000/health`
- Verify no firewall blocking localhost:8000
- Check backend logs

### **Production Issues**

**Problem**: CORS errors
**Solution**:

- Configure backend CORS for frontend domain
- Add proper headers: `Access-Control-Allow-Origin`

**Problem**: 404 errors
**Solution**:

- Verify production API URL is correct
- Check environment variables are properly set
- Test API directly: `curl https://api.domain.com/health`

## 🎯 Testing Commands

```bash
# Test backend directly
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/chat/files/{file_id}

# Test production API
curl -H "Authorization: Bearer <token>" https://aai02.eduhk.hk/api/v1/chat/files/{file_id}

# Verify environment variables
npm run dev    # Check console logs for proxy target
npm run build  # Check build logs for API URL
```

## ✅ Success Indicators

- ✅ No HTML content in image responses
- ✅ Proper Content-Type headers (`image/png`, `image/jpeg`)
- ✅ Browser displays images correctly
- ✅ No CORS errors in console
- ✅ File download works
- ✅ Thumbnails display correctly

## 📚 Additional Resources

- [Vite Proxy Configuration](https://vitejs.dev/config/server-options.html#server-proxy)
- [Environment Variables in Vite](https://vitejs.dev/guide/env-and-mode.html)
- [Production Deployment](https://vitejs.dev/guide/build.html)

---

**Status**: ✅ **ISSUE RESOLVED**  
**Environment**: Works in both development and production  
**Last Updated**: July 19, 2025
