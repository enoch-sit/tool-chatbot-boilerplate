# 🔒 MimicAzure HTTPS Quick Reference

## 🚀 Quick Commands

```bash
# Setup
npm run generate-certs    # Generate SSL certificates
npm run start:https       # Start HTTPS server
node test-https.js        # Test HTTPS endpoint

# Or use Windows batch files
generate-certs.bat        # Generate certificates  
start-https.bat           # Start HTTPS server
```

## 🌐 Endpoints

| Protocol | URL | Port | Trust Level |
|----------|-----|------|-------------|
| **HTTPS** | `https://localhost:5556` | 5556 | ✅ Trusted (mkcert) |
| **HTTP** | `http://localhost:5555` | 5555 | ⚠️ Fallback |

## 📮 Postman Setup

**URL**: `https://localhost:5556/openai/deployments/gpt-35-turbo/chat/completions?stream=true`

**Headers**:

```
Content-Type: application/json
```

**Body**:

```json
{
  "messages": [{"role": "user", "content": "Hello"}]
}
```

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port in use | `docker-compose down` |
| No certificates | `npm run generate-certs` |
| Browser warning | Use mkcert or click "Advanced" |
| Build errors | Check TypeScript syntax |

## 📚 Full Documentation

See **[HTTPS_DOCUMENTATION.md](HTTPS_DOCUMENTATION.md)** for complete setup guide.

---

**Status**: ✅ Production-ready HTTPS mock Azure OpenAI service
