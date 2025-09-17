# Docker Deployment Guide

This guide explains how to deploy the Azure OpenAI Mock Server with Docker, supporting both HTTP and HTTPS on ports 5555 and 5556.

## 📋 Prerequisites

- Docker and Docker Compose installed
- SSL certificates generated (for HTTPS)

## 🔐 Environment Configuration

All secrets and configuration are stored in the `.env` file:

```bash
# Proxy Configuration
USE_EDUHK_PROXY=true                    # true for real API, false for mock
EDUHK_API_KEY=your-real-api-key-here   # Your EdUHK API key

# Server Configuration  
ENABLE_HTTP=true                        # Enable HTTP server on port 5555
ENABLE_HTTPS=true                       # Enable HTTPS server on port 5556
HTTP_PORT=5555                         # HTTP port
HTTPS_PORT=5556                        # HTTPS port

# Security
REQUIRE_API_KEY=false                   # Set to true to require API keys
VALID_API_KEYS=key1,key2,key3          # Comma-separated list of valid keys
```

## 🚀 Quick Start

### 1. Generate SSL Certificates (for HTTPS)
```bash
npm run generate-certs
```

### 2. Configure Environment

Edit the `.env` file with your actual API keys and configuration.

### 3. Deploy with Docker Compose
```bash
# Build and start the container
npm run docker:up

# Or manually:
docker-compose up -d
```

### 4. Verify Deployment
```bash
# Check container status
docker-compose ps

# View logs
npm run docker:logs

# Test HTTP endpoint
curl http://localhost:5555/health

# Test HTTPS endpoint (if enabled)
curl -k https://localhost:5556/health
```

## 🔧 Configuration Options

### Server Modes

**Proxy Mode (USE_EDUHK_PROXY=true):**
- Forwards requests to real EdUHK API
- Returns real AI responses
- Requires valid EDUHK_API_KEY

**Mock Mode (USE_EDUHK_PROXY=false):**  
- Returns simulated responses
- No external API calls
- Good for testing/development

### Port Configuration

**HTTP Only:**
```env
ENABLE_HTTP=true
ENABLE_HTTPS=false
HTTP_PORT=5555
```

**HTTPS Only:**
```env
ENABLE_HTTP=false
ENABLE_HTTPS=true
HTTPS_PORT=5556
```

**Both HTTP and HTTPS:**
```env
ENABLE_HTTP=true
ENABLE_HTTPS=true
HTTP_PORT=5555
HTTPS_PORT=5556
```

## 🛠 Docker Commands

```bash
# Build container
npm run docker:build

# Start container
npm run docker:up

# Stop container
npm run docker:down

# Restart container
npm run docker:restart

# View logs
npm run docker:logs

# Run without compose
npm run docker:run
```

## 📊 Monitoring

### Health Check
The server includes a health check endpoint:
- **HTTP:** `http://localhost:5555/health`
- **HTTPS:** `https://localhost:5556/health`

### Container Health
Docker automatically monitors container health:
```bash
docker-compose ps  # Shows health status
```

### Logs
View real-time logs:
```bash
docker-compose logs -f azure-openai-mock
```

## 🔒 Security Considerations

1. **Environment Variables:** Never commit `.env` with real API keys
2. **SSL Certificates:** Use valid certificates in production
3. **API Key Validation:** Enable `REQUIRE_API_KEY=true` in production
4. **Network Security:** Consider using Docker networks or reverse proxy
5. **Resource Limits:** Adjust memory/CPU limits in docker-compose.yml

## 🚦 API Usage

### Chat Completions Endpoint
```bash
# HTTP
curl -X POST "http://localhost:5555/openai/deployments/gpt-35-turbo/chat/completions?api-version=2024-12-01" \
  -H "Content-Type: application/json" \
  -H "api-key: your-api-key" \
  -d '{"messages":[{"role":"user","content":"Hello"}],"stream":true}'

# HTTPS  
curl -k -X POST "https://localhost:5556/openai/deployments/gpt-35-turbo/chat/completions?api-version=2024-12-01" \
  -H "Content-Type: application/json" \
  -H "api-key: your-api-key" \
  -d '{"messages":[{"role":"user","content":"Hello"}],"stream":true}'
```

## 🐛 Troubleshooting

### Common Issues

**Port already in use:**
```bash
docker-compose down  # Stop existing containers
npm run docker:up    # Restart
```

**SSL certificate errors:**
```bash
npm run generate-certs  # Regenerate certificates
```

**Environment variables not loaded:**
- Check `.env` file exists and has correct format
- Ensure no spaces around `=` in `.env` file
- Restart container after `.env` changes

**API key errors:**
- Verify `EDUHK_API_KEY` in `.env` is correct
- Test API key with direct curl to EdUHK API
- Check container logs for detailed error messages

### Debugging
```bash
# Enter container shell
docker-compose exec azure-openai-mock sh

# View container environment
docker-compose exec azure-openai-mock env

# Check file permissions
docker-compose exec azure-openai-mock ls -la /app
```

## 📈 Production Deployment

For production deployment:

1. **Use environment-specific .env files:**
   ```bash
   cp .env .env.production
   # Edit .env.production with production values
   ```

2. **Enable API key validation:**
   ```env
   REQUIRE_API_KEY=true
   VALID_API_KEYS=prod-key-1,prod-key-2
   ```

3. **Use valid SSL certificates:**
   - Replace self-signed certificates with CA-signed ones
   - Mount certificates from secure location

4. **Set resource limits:**
   - Adjust memory/CPU limits in docker-compose.yml
   - Monitor resource usage

5. **Enable logging:**
   - Configure log rotation
   - Consider external log aggregation

6. **Use reverse proxy:**
   - Consider nginx or traefik for SSL termination
   - Implement rate limiting and security headers
