FROM node:18
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Copy the rest of the files
COPY . .

# Install TypeScript globally
RUN npm install -g typescript

# Show the contents of the directory to debug
RUN ls -la
RUN ls -la /app

# Compile the TypeScript code
RUN tsc

# Show the compiled output directory to debug
RUN ls -la dist || echo "dist directory not found"

# Run the AWS credentials test script
CMD ["node", "dist/aws_credentials_test.js"]