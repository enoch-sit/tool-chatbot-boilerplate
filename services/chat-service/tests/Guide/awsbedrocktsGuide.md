### Key Points
- This guide helps beginners run a TypeScript script to test AWS Bedrock credentials and model access using Docker.
- It assumes minimal programming experience and uses the provided TypeScript script, which validates AWS credentials and tests model invocation.
- AWS credentials and model access are required, configured via a `.env` file.
- Docker ensures a consistent environment, simplifying setup for new programmers.
- The process involves setting up AWS, installing Docker, creating project files, and running the script in a container.

### Overview
This guide walks you through running a TypeScript script to test AWS Bedrock credentials and model access, similar to a previous Python script. The script checks if your AWS credentials are valid by listing available foundation models and tests access to specific models (e.g., Amazon Nova, Titan) by sending a test prompt. Docker is used to create a consistent environment, making it easier for beginners to avoid complex setup issues. The guide is designed for those with minimal programming experience, providing detailed steps to set up your AWS account, install Docker, configure credentials, and run the test script in a Docker container.

### Prerequisites
- **AWS Account**: You need an AWS account with access to Amazon Bedrock and specific models.
- **Computer**: A computer with internet access.
- **Basic Terminal Skills**: Comfort using a terminal or command prompt.
- **Docker**: Docker Desktop installed to run the script in a container.

### Step-by-Step Instructions

#### Step 1: Set Up Your AWS Account
1. **Sign Up for AWS**:
   - If you don’t have an AWS account, create one at [AWS Sign Up](https://aws.amazon.com).
   - Follow the prompts, including providing payment information (AWS offers a free tier for many services).
2. **Request Bedrock Access**:
   - Log in to the [AWS Management Console](https://console.aws.amazon.com).
   - Navigate to **Amazon Bedrock**.
   - Request access to Amazon Bedrock and specifically the models listed in the script (e.g., `amazon.nova-micro-v1:0`, `amazon.titan-text-express-v1`, `meta.llama3-70b-instruct-v1:0`). Approval may take hours or days.
3. **Create IAM User and Access Keys**:
   - Go to the [IAM Console](https://console.aws.amazon.com/iam/).
   - Create a new user (e.g., `bedrock-test-user`) with **Programmatic access**.
   - Attach a custom policy to allow listing and invoking models:
     ```json
     {
         "Version": "2012-10-17",
         "Statement": [
             {
                 "Sid": "AllowBedrockAccess",
                 "Effect": "Allow",
                 "Action": [
                     "bedrock:ListFoundationModels",
                     "bedrock:InvokeModel"
                 ],
                 "Resource": "*"
             }
         ]
     }
     ```
   - Download the **Access Key ID** and **Secret Access Key**. Store these securely.

#### Step 2: Install Docker
1. **Download Docker Desktop**:
   - Visit [Docker Get Started](https://www.docker.com/get-started/) and download Docker Desktop for your operating system (Windows, macOS, or Linux).
2. **Install Docker**:
   - **Windows/macOS**: Run the installer and follow the prompts. Enable WSL 2 on Windows if prompted.
   - **Linux**: Follow the [Docker installation guide](https://docs.docker.com/engine/install/) for your distribution (e.g., Ubuntu).
3. **Verify Installation**:
   - Open a terminal (Linux/macOS) or Command Prompt/PowerShell (Windows).
   - Run `docker --version` to confirm Docker is installed (e.g., `Docker version 20.10.17`).
   - Start Docker Desktop if it’s not running.

#### Step 3: Create the Project Directory
1. Create a folder named `bedrock-test-ts`:
   ```bash
   mkdir bedrock-test-ts
   cd bedrock-test-ts
   ```
2. This folder will contain your project files.

#### Step 4: Create the TypeScript Script
1. Create a `src` directory:
   ```bash
   mkdir src
   ```
2. Create a file named `src/testBedrock.ts` and add the following code:

```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { BedrockClient, ListFoundationModelsCommand } from '@aws-sdk/client-bedrock';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Make sure we're loading environment variables correctly
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);
console.log('.env file exists:', fs.existsSync(envPath) ? 'Yes' : 'No');

// Load environment variables from .env file
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('.env file loaded successfully');
}

// Debug log to check if environment variables are loaded
console.log('Debug - Environment variables:');
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? `Set: ${process.env.AWS_ACCESS_KEY_ID.substring(0, 5)}...` : 'Not set');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'Set (value hidden)' : 'Not set');

// Configure AWS credentials using environment variables
const config = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
};

console.log('Config accessKeyId empty?', config.credentials.accessKeyId === '');
console.log('Config secretAccessKey empty?', config.credentials.secretAccessKey === '');

/**
 * Tests AWS credentials by trying to list available foundation models
 */
export async function testAwsCredentials(): Promise<boolean> {
  console.log('\n[TEST] Validating AWS credentials...');
  
  if (!config.credentials.accessKeyId || !config.credentials.secretAccessKey) {
    console.error('❌ AWS credentials are not set in environment variables.');
    console.log('Make sure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set in your .env file.');
    return false;
  }
  
  try {
    const bedrockClient = new BedrockClient(config);
    const command = new ListFoundationModelsCommand({});
    
    console.log(`Connecting to AWS Bedrock in ${config.region} region...`);
    const response = await bedrockClient.send(command);
    
    console.log('✅ AWS credentials are valid. Successfully connected to Bedrock.');
    console.log(`Found ${response.modelSummaries?.length || 0} foundation models available.`);
    
    return true;
  } catch (error: any) {
    console.error('❌ Failed to authenticate with AWS:');
    console.error(`Error: ${error.message}`);
    console.error(`Error type: ${error.name}`);
    console.error(`Error code: ${error.$metadata?.httpStatusCode || 'unknown'}`);
    
    // More detailed error handling based on specific error types
    if (error.name === 'ExpiredTokenException' || error.message.includes('expired')) {
      console.log('Your AWS credentials have expired. Please generate new credentials in the AWS Console.');
    } else if (error.name === 'InvalidSignatureException' || error.message.includes('signature')) {
      console.log('Invalid signature error. This usually means your access key or secret key is incorrect.');
    } else if (error.name === 'UnrecognizedClientException') {
      console.log('The AWS access key ID you provided does not exist in AWS records.');
    } else if (error.name === 'AccessDeniedException' || error.name === 'AuthorizationError' || 
               error.message.includes('not authorized')) {
      console.log('Your AWS credentials don\'t have permission to access Bedrock services.');
      console.log('Make sure your IAM user has the correct policies attached.');
      console.log('Required permissions include: bedrock:ListFoundationModels, bedrock:InvokeModel');
    }
    
    return false;
  }
}

/**
 * Tests access to specific model by sending a minimal request
 * @param modelId The ID of the model to test
 */
export async function testModelAccess(modelId: string): Promise<boolean> {
  console.log(`\n[TEST] Testing access to model: ${modelId}`);
  
  try {
    const bedrockRuntimeClient = new BedrockRuntimeClient(config);
    
    let promptBody: any;
    const contentType = 'application/json';
    
    if (modelId.includes('amazon.nova')) {
      // Format for Amazon's Nova models
      promptBody = {
        inferenceConfig: {
          max_new_tokens: 10,
          temperature: 0.7
        },
        messages: [
          {
            role: "user",
            content: [
              {
                text: "Hello, this is a test message."
              }
            ]
          }
        ]
      };
    } else if (modelId.includes('amazon.titan')) {
      // Format for Amazon's Titan models
      promptBody = {
        inputText: "Hello, this is a test message.",
        textGenerationConfig: {
          maxTokenCount: 10,
          temperature: 0.7
        }
      };
    } else if (modelId.includes('meta.llama')) {
      // Format for Meta's Llama models
      promptBody = {
        prompt: "Hello, this is a test message.",
        temperature: 0.7,
        max_gen_len: 10
      };
    } else if (modelId.includes('anthropic')) {
      // Format for Anthropic Claude models
      promptBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 10,
        messages: [
          {
            role: "user",
            content: "Hello, this is a test message."
          }
        ]
      };
    } else {
      console.log(`Unknown model ID format: ${modelId}. Using default JSON format.`);
      promptBody = {
        prompt: "Hello, this is a test message.",
        max_tokens: 10
      };
    }
    
    const command = new InvokeModelCommand({
      modelId,
      contentType,
      accept: contentType,
      body: JSON.stringify(promptBody)
    });
    
    console.log(`Sending test request to ${modelId}...`);
    const response = await bedrockRuntimeClient.send(command);
    
    if (response && response.body) {
      const responseBody = new TextDecoder().decode(response.body);
      console.log('✅ Successfully accessed model. Response:');
      console.log(responseBody.substring(0, 100) + (responseBody.length > 100 ? '...' : ''));
      return true;
    } else {
      console.log('⚠️ Received empty response from model.');
      return false;
    }
  } catch (error: any) {
    console.error(`❌ Failed to access model ${modelId}:`);
    console.error(`Error: ${error.message}`);
    
    if (error.message.includes('not authorized') || error.message.includes('AccessDeniedException')) {
      console.log(`Your AWS account may not have access to the ${modelId} model.`);
      console.log('Make sure you have requested and been granted access to this model in the AWS console.');
    }
    
    return false;
  }
}

/**
 * Run all AWS credential tests
 */
export async function runAllTests(): Promise<void> {
  console.log('=== AWS BEDROCK CREDENTIALS VALIDATION ===');
  console.log('Testing AWS credentials and model access for chat service...');
  
  // First check if basic credentials work
  const credentialsValid = await testAwsCredentials();
  
  if (!credentialsValid) {
    console.error('\n❌ AWS credentials validation failed. Cannot proceed with model tests.');
    return;
  }
  
  // If credentials are valid, test each model
  const modelsToTest = [
    'amazon.nova-micro-v1:0',
    'amazon.nova-lite-v1:0',
    'amazon.titan-text-express-v1',
    'meta.llama3-70b-instruct-v1:0'
  ];
  
  const results: Record<string, boolean> = {};
  
  for (const modelId of modelsToTest) {
    results[modelId] = await testModelAccess(modelId);
  }
  
  // Print summary
  console.log('\n=== TEST SUMMARY ===');
  console.log('AWS Credentials:', credentialsValid ? '✅ VALID' : '❌ INVALID');
  console.log('Model Access:');
  
  for (const [modelId, result] of Object.entries(results)) {
    console.log(`- ${modelId}: ${result ? '✅ ACCESSIBLE' : '❌ NOT ACCESSIBLE'}`);
  }
  
  if (Object.values(results).some(result => !result)) {
    console.log('\n⚠️ Some models are not accessible with your current AWS credentials.');
    console.log('Please check your AWS console to ensure you have requested access to these models.');
  } else if (credentialsValid && Object.values(results).every(result => result)) {
    console.log('\n✅ All tests passed! Your AWS credentials are properly configured.');
  }
}

// Run all tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Unhandled error during tests:');
    console.error(error);
    process.exit(1);
  });
}
```

#### Step 5: Create the `.env` File
1. In the `bedrock-test-ts` folder, create a file named `.env`.
2. Add the following content:
   ```
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_access_key_id
   AWS_SECRET_ACCESS_KEY=your_secret_access_key
   ```
3. Replace `your_access_key_id` and `your_secret_access_key` with the credentials from Step 1.

#### Step 6: Create a Dockerfile
1. In the `bedrock-test-ts` folder, create a file named `Dockerfile`.
2. Add the following content:

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm install -g typescript
RUN tsc
CMD ["node", "dist/testBedrock.js"]
```

#### Step 7: Create `package.json`
1. In the `bedrock-test-ts` folder, create or update `package.json` with:
   ```json
   {
     "name": "bedrock-test-ts",
     "version": "1.0.0",
     "main": "dist/testBedrock.js",
     "scripts": {
       "build": "tsc",
       "start": "node dist/testBedrock.js"
     },
     "dependencies": {
       "@aws-sdk/client-bedrock": "^3.799.0",
       "@aws-sdk/client-bedrock-runtime": "^3.799.0",
       "dotenv": "^16.0.0"
     },
     "devDependencies": {
       "typescript": "^5.0.0",
       "@types/node": "^20.0.0"
     }
   }
   ```

#### Step 8: Create `tsconfig.json`
1. In the `bedrock-test-ts` folder, create a file named `tsconfig.json` with:
   ```json
   {
     "compilerOptions": {
       "target": "es6",
       "module": "commonjs",
       "outDir": "./dist",
       "rootDir": "./src",
       "strict": true,
       "esModuleInterop": true
     }
   }
   ```

#### Step 9: Build the Docker Image
1. In the terminal, ensure you’re in the `bedrock-test-ts` folder.
2. Run:
   ```bash
   docker build -t bedrock-test-ts .
   ```
3. Wait for the build to complete. This creates an image named `bedrock-test-ts`.

#### Step 10: Run the Docker Container
1. Run the container:
   ```bash
   docker run bedrock-test-ts
   ```
2. You should see output indicating whether your credentials are valid and which models are accessible, such as:
   ```
   === AWS BEDROCK CREDENTIALS VALIDATION ===
   Testing AWS credentials and model access for chat service...
   [TEST] Validating AWS credentials...
   Connecting to AWS Bedrock in us-east-1 region...
   ✅ AWS credentials are valid. Successfully connected to Bedrock.
   Found 4 foundation models available.
   ...
   === TEST SUMMARY ===
   AWS Credentials: ✅ VALID
   Model Access:
   - amazon.nova-micro-v1:0: ✅ ACCESSIBLE
   - amazon.nova-lite-v1:0: ✅ ACCESSIBLE
   - amazon.titan-text-express-v1: ✅ ACCESSIBLE
   - meta.llama3-70b-instruct-v1:0: ✅ ACCESSIBLE
   ✅ All tests passed! Your AWS credentials are properly configured.
   ```

#### Troubleshooting
- **Access Denied Error**: Ensure your IAM user has the correct permissions and model access in the AWS Management Console.
- **Docker Build Fails**: Check for typos in the Dockerfile or ensure internet access for downloading Node.js and packages.
- **Credentials Not Found**: Verify the `.env` file is correctly formatted and located in `bedrock-test-ts/.env`.
- **Model Access Issues**: Confirm you’ve requested access to the models listed in the script.

---

### Comprehensive Guide to Running AWS Bedrock Test API with TypeScript and Docker for Beginners

This comprehensive guide is designed for novice programmers to execute an AWS Bedrock test API using a TypeScript script within a Docker container. The script validates AWS credentials by listing available foundation models and tests access to specific models (e.g., Amazon Nova, Titan, Llama) by invoking them with a test prompt. This guide mirrors the logic flow of a previously provided Python script but adapts it for TypeScript, leveraging the AWS SDK for JavaScript v3. It covers every aspect, from setting up an AWS account to running the script in a Dockerized environment, ensuring a smooth experience for those with minimal programming experience.

#### Introduction
Amazon Bedrock is a managed service that provides access to foundation models for tasks like text generation and embeddings. The TypeScript script provided tests AWS Bedrock by:
1. **Validating Credentials**: Checking if AWS credentials can list foundation models using the `ListFoundationModelsCommand`.
2. **Testing Model Access**: Invoking specific models with a test prompt using the `InvokeModelCommand`.
3. **Summarizing Results**: Reporting whether credentials are valid and which models are accessible.

Docker is used to create a consistent, isolated environment, eliminating the need for complex local setup. This guide assumes you’re starting from scratch and provides detailed instructions for setting up AWS, installing Docker, configuring project files, and running the test script.

#### Prerequisites
To follow this guide, you need:
- **AWS Account**: Access to Amazon Bedrock and specific models.
- **Computer**: With internet access.
- **Basic Terminal Skills**: Ability to run commands in a terminal or command prompt.
- **Docker**: Docker Desktop installed for containerized execution.
- No prior experience with TypeScript, Node.js, or AWS is required, as all steps are explained in detail.

#### Step-by-Step Process

##### Step 1: Set Up AWS Account and Bedrock Access
AWS Bedrock requires explicit access to its services and models, which must be configured in your AWS account.

1. **Create an AWS Account**:
   - If you don’t have an AWS account, sign up at [AWS Sign Up](https://aws.amazon.com). Follow the prompts, including providing payment information (AWS offers a free tier for many services).
2. **Request Bedrock Access**:
   - Log in to the [AWS Management Console](https://console.aws.amazon.com).
   - Navigate to **Amazon Bedrock** in the console.
   - Request access to Amazon Bedrock. Approval may take a few hours or days.
   - Once approved, go to the **Model Access** section in the Bedrock console and request access to the models listed in the script: `amazon.nova-micro-v1:0`, `amazon.nova-lite-v1:0`, `amazon.titan-text-express-v1`, and `meta.llama3-70b-instruct-v1:0`. Approval times may vary.
3. **Create IAM User and Access Keys**:
   - Go to the [IAM Console](https://console.aws.amazon.com/iam/).
   - Create a new IAM user (e.g., `bedrock-test-user`) with **Programmatic access**.
   - Attach a custom policy to allow listing and invoking models:
     ```json
     {
         "Version": "2012-10-17",
         "Statement": [
             {
                 "Sid": "AllowBedrockAccess",
                 "Effect": "Allow",
                 "Action": [
                     "bedrock:ListFoundationModels",
                     "bedrock:InvokeModel"
                 ],
                 "Resource": "*"
             }
         ]
     }
     ```
   - After creating the user, download the **Access Key ID** and **Secret Access Key**. Store these securely, as they are needed for authentication.

##### Step 2: Install Docker
Docker is essential for running the TypeScript script in a controlled environment, ensuring consistency across systems.

1. **Download Docker Desktop**:
   - Visit [Docker Get Started](https://www.docker.com/get-started/) and download Docker Desktop for your operating system (Windows, macOS, or Linux).
2. **Install Docker**:
   - **Windows/macOS**: Run the installer and follow the prompts. Enable WSL 2 on Windows if prompted.
   - **Linux**: Follow the [Docker installation guide](https://docs.docker.com/engine/install/) for your distribution (e.g., Ubuntu, CentOS).
3. **Verify Installation**:
   - Open a terminal (Linux/macOS) or Command Prompt/PowerShell (Windows).
   - Run `docker --version`. You should see output like `Docker version 20.10.17, build 100c701`.
   - Start Docker Desktop if it’s not already running.

##### Step 3: Create the Project Directory
Organize your files in a dedicated folder to keep the project structured.

1. Create a folder named `bedrock-test-ts`:
   ```bash
   mkdir bedrock-test-ts
   cd bedrock-test-ts
   ```
2. This folder will contain all project files, including the TypeScript script, configuration files, and Docker setup.

##### Step 4: Create the TypeScript Script
The TypeScript script is the core of the test, implementing the logic to validate AWS credentials and test model access.

1. Create a `src` directory to hold the TypeScript code:
   ```bash
   mkdir src
   ```
2. Create a file named `src/testBedrock.ts` and add the provided TypeScript code (see the artifact above). This script:
   - Loads environment variables using `dotenv`.
   - Configures AWS credentials.
   - Tests credentials by listing foundation models with `ListFoundationModelsCommand`.
   - Tests model access by invoking models with `InvokeModelCommand`.
   - Summarizes the results.

##### Step 5: Create the `.env` File
The `.env` file stores your AWS credentials, which the script uses for authentication.

1. In the `bedrock-test-ts` folder, create a file named `.env`.
2. Add the following content:
   ```
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_access_key_id
   AWS_SECRET_ACCESS_KEY=your_secret_access_key
   ```
3. Replace `your_access_key_id` and `your_secret_access_key` with the credentials obtained in Step 1.
4. Ensure there are no extra spaces or quotes around the values.

##### Step 6: Create the Dockerfile
The Dockerfile defines the environment for running the TypeScript script, including Node.js, TypeScript, and dependencies.

1. In the `bedrock-test-ts` folder, create a file named `Dockerfile`.
2. Add the provided Dockerfile content (see the artifact above). This Dockerfile:
   - Uses the `node:18` base image.
   - Sets up a working directory (`/app`).
   - Installs project dependencies.
   - Installs TypeScript globally.
   - Compiles the TypeScript code to JavaScript.
   - Runs the compiled JavaScript file.

##### Step 7: Create `package.json`
The `package.json` file specifies the project’s dependencies and scripts.

1. In the `bedrock-test-ts` folder, create or update `package.json` with the provided content (see Step 7 in the direct answer section). This file:
   - Defines the project name, version, and main entry point.
   - Lists dependencies (`@aws-sdk/client-bedrock`, `@aws-sdk/client-bedrock-runtime`, `dotenv`).
   - Lists development dependencies (`typescript`, `@types/node`).
   - Includes scripts for building and running the project.

##### Step 8: Create `tsconfig.json`
The `tsconfig.json` file configures the TypeScript compiler to convert TypeScript to JavaScript.

1. In the `bedrock-test-ts` folder, create a file named `tsconfig.json` with the provided content (see Step 8 in the direct answer section). This configuration:
   - Targets ES6 JavaScript.
   - Uses CommonJS modules for compatibility with Node.js.
   - Outputs compiled JavaScript to the `dist` directory.
   - Enables strict type checking and ES module interoperability.

##### Step 9: Build the Docker Image
Build the Docker image to prepare the environment for running the script.

1. In the terminal, ensure you’re in the `bedrock-test-ts` folder.
2. Run:
   ```bash
   docker build -t bedrock-test-ts .
   ```
3. Wait for the build to complete. This process:
   - Downloads the Node.js base image.
   - Installs dependencies specified in `package.json`.
   - Compiles the TypeScript code to JavaScript.
   - Creates an image named `bedrock-test-ts`.

##### Step 10: Run the Docker Container
Run the Docker container to execute the test script.

1. Run the following command:
   ```bash
   docker run bedrock-test-ts
   ```
2. The container will:
   - Load the `.env` file with AWS credentials.
   - Execute the compiled JavaScript file (`dist/testBedrock.js`).
   - Output the results of the credential validation and model access tests.
3. Expected output includes:
   - Confirmation that the `.env` file was loaded.
   - Validation of AWS credentials (e.g., listing foundation models).
   - Results of model access tests for each model (e.g., Amazon Nova, Titan).
   - A summary indicating whether all tests passed.

Example output:
```
Loading .env from: /app/.env
.env file exists: Yes
.env file loaded successfully
Debug - Environment variables:
AWS_REGION: us-east-1
AWS_ACCESS_KEY_ID: Set: AKIA...
AWS_SECRET_ACCESS_KEY: Set (value hidden)
Config accessKeyId empty? false
Config secretAccessKey empty? false

=== AWS BEDROCK CREDENTIALS VALIDATION ===
Testing AWS credentials and model access for chat service...

[TEST] Validating AWS credentials...
Connecting to AWS Bedrock in us-east-1 region...
✅ AWS credentials are valid. Successfully connected to Bedrock.
Found 4 foundation models available.

[TEST] Testing access to model: amazon.nova-micro-v1:0
Sending test request to amazon.nova-micro-v1:0...
✅ Successfully accessed model. Response: {"content": [{"text": "Hello, this is a test message."}],"role": "assistant","index": 0}...

[TEST] Testing access to model: amazon.nova-lite-v1:0
...

=== TEST SUMMARY ===
AWS Credentials: ✅ VALID
Model Access:
- amazon.nova-micro-v1:0: ✅ ACCESSIBLE
- amazon.nova-lite-v1:0: ✅ ACCESSIBLE
- amazon.titan-text-express-v