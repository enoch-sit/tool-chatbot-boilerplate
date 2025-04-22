# Accounting Service

The Accounting Service is responsible for managing user credits, tracking usage, and handling streaming session accounting for the chatbot application.

## Features

- Credit allocation and management
- Usage tracking and analytics
- Streaming session credit pre-allocation and refunds
- Role-based access control

## Technology Stack

- Node.js & TypeScript
- Express.js
- PostgreSQL with Sequelize ORM
- Docker & Docker Compose
- Jest for testing

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Docker and Docker Compose (for containerized deployment)
- PostgreSQL (if running outside Docker)

### Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables (copy from .env.example):
   ```bash
   cp .env.example .env
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

### Docker Deployment

Run the service with a PostgreSQL database using Docker Compose:

```bash
docker-compose up -d
```

This will start the Accounting Service on port 3001 and PostgreSQL on port 5432.

## Deployment Guide

### Linux Server Deployment

1. **Prepare the server**:
   ```bash
   # Update packages
   sudo apt update && sudo apt upgrade -y
   
   # Install Docker and Docker Compose
   sudo apt install -y docker.io docker-compose
   
   # Start and enable Docker
   sudo systemctl start docker
   sudo systemctl enable docker
   
   # Add your user to the docker group to run docker without sudo
   sudo usermod -aG docker $USER
   # Log out and log back in for this to take effect
   ```

2. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd tool-chatbot-boilerplate/services/accounting-service
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   
   # Edit the .env file with your production settings
   nano .env
   ```

4. **Deploy with Docker Compose**:
   ```bash
   # Build and start the services
   docker-compose up -d --build
   
   # Check the logs
   docker-compose logs -f
   ```

5. **Set up reverse proxy (optional but recommended)**:
   ```bash
   # Install Nginx
   sudo apt install -y nginx
   
   # Configure Nginx as a reverse proxy
   sudo nano /etc/nginx/sites-available/accounting-service
   ```

   Add the following configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

   Enable the site and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/accounting-service /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

6. **Setup SSL with Let's Encrypt (recommended)**:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### Windows Docker Desktop Deployment

1. **Install Docker Desktop**:
   - Download Docker Desktop for Windows from [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
   - Install the application following the installation wizard
   - Start Docker Desktop and wait until it's running (check the system tray icon)

2. **Clone the repository**:
   - Clone the repository using Git or download it as a ZIP file
   - Navigate to the accounting service directory in Command Prompt or PowerShell:
     ```powershell
     cd path\to\tool-chatbot-boilerplate\services\accounting-service
     ```

3. **Configure environment variables**:
   ```powershell
   copy .env.example .env
   ```
   Edit the .env file with your preferred text editor to configure the environment variables.

4. **Deploy with Docker Compose**:
   ```powershell
   # Build and start the services
   docker-compose up -d --build
   
   # Check the logs
   docker-compose logs -f
   ```

5. **Access the service**:
   - The accounting service should now be accessible at [http://localhost:3001](http://localhost:3001)
   - The PostgreSQL database will be available on port 5432

6. **Troubleshooting**:
   - If you encounter permission issues, make sure Docker Desktop has permission to access your drives
   - Check Docker Desktop settings to ensure enough resources are allocated
   - Restart Docker Desktop if you encounter network-related issues

### API Testing

You can test the API endpoints using the Postman collection in the `/docs` folder or with curl:

```bash
# Get health status
curl http://localhost:3001/health

# Check user balance (with authentication)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3001/api/credits/balance
```

## Testing

Run the test suite:

```bash
npm test
```

Run tests with coverage report:

```bash
npm run test:coverage
```

## Production Deployment

For production deployment, make sure to:

1. Set appropriate environment variables
2. Use a production-grade PostgreSQL setup
3. Set up proper logging
4. Implement monitoring

## Documentation

Detailed documentation can be found in the `/docs` folder:

- [API Documentation](./docs/api.md)
- [Detailed Service Guide](./docs/README.md)

## License

This project is licensed under the MIT License - see the LICENSE file for details.