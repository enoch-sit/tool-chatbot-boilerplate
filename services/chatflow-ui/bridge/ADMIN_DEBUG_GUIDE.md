# Admin Dashboard Debug Guide

## Overview
This document provides debugging strategies for the AIDCEC Bridge admin dashboard, particularly for user-to-chatflow assignment functionality.

## Chatbot Information
- **Name**: AIDCEC (English: "AIDCEC - Bridge", Chinese: "AIDCEC - 進階聊天機器人")
- **Purpose**: Advanced chatbot with multi-language support and admin management

## Common Debug Areas

### 1. Permission Issues
Check user permissions in browser console:
```javascript
// In browser console
localStorage.getItem('auth-tokens')
// Look for user role and permissions
```

### 2. API Endpoint Issues
The admin functionality relies on these key endpoints:
- `GET /api/v1/admin/chatflows` - List chatflows
- `GET /api/v1/admin/chatflows/{id}/users` - Get users for chatflow
- `POST /api/v1/admin/chatflows/{id}/users` - Add user to chatflow
- `DELETE /api/v1/admin/chatflows/{id}/users` - Remove user from chatflow

### 3. State Management Issues
Monitor admin store state:
```javascript
// In React DevTools or browser console
window.__ZUSTAND_STORE_STATE__ // If enabled
```

### 4. Debug Console Outputs
Look for these console messages:
- "AdminPage useEffect triggered, canAccessAdmin: {boolean}"
- "Fetching admin data..."
- "Failed to fetch admin data: {error}"
- "Failed to add user: {error}"
- "Failed to remove user: {error}"

### 5. Common Error Patterns

#### Permission Denied
- Check `usePermissions` hook output
- Verify JWT token validity
- Confirm user has 'admin' role

#### API Connection Issues
- Network tab in DevTools
- CORS issues (common in development)
- Backend server status

#### UI State Issues
- Modal not opening/closing
- Loading states not clearing
- Error messages not displaying

## Debug Tools

### Built-in Debug Log
The app includes a floating debug panel (visible in development):
- Shows real-time logs
- Can be toggled on/off
- Captures API calls and state changes

### Manual Debug Commands
```javascript
// Enable debug mode
window.debugMode = true;

// Check current user
console.log(JSON.parse(localStorage.getItem('auth-tokens')));

// Check admin permissions
// (Run in React component context)
const { canAccessAdmin, canManageUsers } = usePermissions();
console.log({ canAccessAdmin, canManageUsers });
```

## Quick Debug Checklist

1. **User Authentication**
   - [ ] User is logged in
   - [ ] User has admin role
   - [ ] JWT token is valid

2. **API Connectivity**
   - [ ] Backend server running
   - [ ] Network requests succeeding
   - [ ] Correct API base URL

3. **Data Loading**
   - [ ] Chatflows loading successfully
   - [ ] Users loading for specific chatflow
   - [ ] Stats loading (if permissions allow)

4. **User Assignment**
   - [ ] Email validation working
   - [ ] Assignment API calls succeeding
   - [ ] User list refreshing after assignment
   - [ ] Success/error messages displaying

5. **UI State**
   - [ ] Modals opening/closing properly
   - [ ] Loading indicators working
   - [ ] Error alerts displaying
   - [ ] Form inputs clearing after actions

## Error Resolution

### "No admin access" message
1. Check user role in JWT token
2. Verify backend role assignment
3. Check permission configuration

### API 403/401 errors
1. Refresh JWT token
2. Re-login user
3. Check backend authentication middleware

### Empty chatflow list
1. Check API endpoint response
2. Verify chatflow sync status
3. Check database content

### User assignment failures
1. Verify email format
2. Check user exists in system
3. Check for duplicate assignments
4. Verify API payload format

## Development vs Production

### Development
- Debug panel visible
- Console logs enabled
- Detailed error messages

### Production
- Debug panel hidden
- Console logs minimized
- User-friendly error messages

## Monitoring Admin Actions

All admin actions are logged through:
1. Console outputs (development)
2. Debug store (if enabled)
3. API response logging
4. Error boundary captures

For production debugging, enable the debug store temporarily or check browser network tab for API call details.
