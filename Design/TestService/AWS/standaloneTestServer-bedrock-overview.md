# AWS Bedrock Nova Micro Test Server Development Guide

This guide will help you build a standalone TypeScript chat server to test AWS Bedrock's Amazon Nova Micro LLM. This is ideal preparation work before implementing the full chatbot platform described in the ChatBotBluePrint.

## Introduction

The Amazon Nova Micro model (`amazon.nova-micro-v1:0`) is a text-only LLM optimized for low latency and cost. This guide will walk you through creating a simple terminal-based chat server that:

1. Accepts user input
2. Sends it to the Nova Micro model
3. Receives and displays the model's response
4. Maintains conversation history for context

## Prerequisites

- Node.js (v16+)
- TypeScript
- AWS account with access to Bedrock
- Basic command line knowledge

## Step 1: Setting Up Your Environment

First, let's create a project directory and initialize it:

```bash
# Create a project directory
mkdir bedrock-nova-chat
cd bedrock-nova-chat

# Initialize a Node.js project
npm init -y

# Install required dependencies
npm install @aws-sdk/client-bedrock-runtime @types/node

# Install TypeScript
npm install -g typescript
npm install --save-dev typescript
```

Create a TypeScript configuration file (`tsconfig.json`):

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

Create the source directory:

```bash
mkdir src
```

## Step 2: Configure AWS Credentials

You'll need AWS credentials with permissions to access Bedrock services. If you don't have them already, follow these steps:

1. Sign up for an AWS account at [aws.amazon.com](https://aws.amazon.com)
2. Create an IAM user with programmatic access
3. Attach a policy that allows `bedrock:InvokeModel` access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-micro-v1:0"
    }
  ]
}
```

4. Configure AWS CLI with your credentials:

```bash
aws configure
```

Enter your access key, secret key, region (e.g., `us-east-1`), and output format (`json`).

## Step 3: Request Access to Nova Micro Model

Before using the Nova Micro model, you must request access to it in the AWS Management Console:

1. Navigate to Amazon Bedrock in the AWS console
2. Go to "Model access" in the left sidebar
3. Find "Amazon Nova Micro" and request access
4. Wait for approval (this may take some time)

## Step 4: Create the Chat Server

Now, let's create the main chat server file. Create a file named `src/bedrock_nova_chat.ts`:

```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import * as readline from 'readline';

// Set up Bedrock runtime client
const client = new BedrockRuntimeClient({ region: 'us-east-1' });

// Define the model ID
const modelId = 'amazon.nova-micro-v1:0';

// Define message type
type Message = { role: 'user' | 'assistant'; content: string };

// Initialize messages list
const messages: Message[] = [];

// Set up readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("Welcome to the Bedrock Nova Micro Chat Server");
console.log("Type 'quit' to exit");

async function chatLoop() {
  rl.question('User: ', async (input) => {
    if (input.toLowerCase() === 'quit') {
      rl.close();
      return;
    }
    messages.push({ role: 'user', content: input });
    const requestBody = {
      schemaVersion: "messages-v1",
      messages: messages.map(m => ({ role: m.role, content: [{ text: m.content }] })),
      inferenceConfig: {
        maxTokens: 1000,
        temperature: 0.7,
        topP: 0.9
      }
    };
    const command = new InvokeModelCommand({
      modelId: modelId,
      body: JSON.stringify(requestBody),
      contentType: 'application/json',
      accept: 'application/json'
    });
    try {
      const response = await client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const reply = responseBody.results[0].outputText;
      console.log("Assistant: " + reply);
      messages.push({ role: 'assistant', content: reply });
    } catch (error) {
      console.error("Error:", error);
    }
    chatLoop();
  });
}

chatLoop();
```

## Step 5: Compile and Run the Server

Now, compile the TypeScript code to JavaScript:

```bash
tsc src/bedrock_nova_chat.ts --outDir dist
```

Run the compiled JavaScript:

```bash
node dist/bedrock_nova_chat.js
```

## Understanding the Code

Let's break down the key components of the chat server:

### 1. Imports and Setup

```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import * as readline from 'readline';

// Set up Bedrock runtime client
const client = new BedrockRuntimeClient({ region: 'us-east-1' });

// Define the model ID
const modelId = 'amazon.nova-micro-v1:0';
```

This section:
- Imports the AWS SDK for Bedrock
- Creates a Bedrock client with your AWS region
- Specifies the Nova Micro model ID

### 2. Message Handling

```typescript
// Define message type
type Message = { role: 'user' | 'assistant'; content: string };

// Initialize messages list
const messages: Message[] = [];
```

We define a message type and array to store the chat history, which provides the LLM with context for each new prompt.

### 3. Chat Loop

```typescript
async function chatLoop() {
  rl.question('User: ', async (input) => {
    if (input.toLowerCase() === 'quit') {
      rl.close();
      return;
    }
    // Process input and get response...
    chatLoop();
  });
}
```

This recursive function:
- Prompts the user for input
- Exits if the user types "quit"
- Processes the input and gets a response from AWS Bedrock
- Calls itself to continue the conversation

### 4. Request Formatting

```typescript
const requestBody = {
  schemaVersion: "messages-v1",
  messages: messages.map(m => ({ role: m.role, content: [{ text: m.content }] })),
  inferenceConfig: {
    maxTokens: 1000,
    temperature: 0.7,
    topP: 0.9
  }
};
```

This formats the request according to Nova Micro's specific requirements:
- `schemaVersion` specifies the message format (must be "messages-v1")
- `messages` contains the conversation history, where each message has a role and content
- `inferenceConfig` includes parameters that control the output:
  - `maxTokens`: Maximum number of tokens to generate (1-5000)
  - `temperature`: Controls randomness (0.00001-1)
  - `topP`: Controls diversity (0-1)

### 5. Making the API Request

```typescript
const command = new InvokeModelCommand({
  modelId: modelId,
  body: JSON.stringify(requestBody),
  contentType: 'application/json',
  accept: 'application/json'
});
try {
  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const reply = responseBody.results[0].outputText;
  console.log("Assistant: " + reply);
  messages.push({ role: 'assistant', content: reply });
} catch (error) {
  console.error("Error:", error);
}
```

This section:
- Creates an `InvokeModelCommand` with the request body
- Sends the command to AWS Bedrock
- Parses the response to extract the generated text
- Adds the assistant's response to the message history

## Customization Options

### Adjusting Model Parameters

You can modify the `inferenceConfig` to change the model's behavior:

```typescript
inferenceConfig: {
  maxTokens: 2000,    // Increase for longer responses
  temperature: 0.5,   // Lower for more deterministic responses
  topP: 0.8,          // Adjust for different sampling strategies
  stopSequences: ["User:"] // Add stop sequences if needed
}
```

### Using a Different Model

To use a different model, simply change the `modelId` variable:

```typescript
// For Nova Lite
const modelId = 'amazon.nova-lite-v1:0';

// For Claude models
const modelId = 'anthropic.claude-3-sonnet-20240229-v1:0';
```

Note: Different models may require different request formats. Check the AWS Bedrock documentation for details.

### Adding System Messages

For models that support system messages, you can add one like this:

```typescript
const requestBody = {
  schemaVersion: "messages-v1",
  system: [{ text: "You are a helpful assistant specializing in AWS." }],
  messages: messages.map(m => ({ role: m.role, content: [{ text: m.content }] })),
  inferenceConfig: {
    maxTokens: 1000,
    temperature: 0.7,
    topP: 0.9
  }
};
```

## Common Errors and Troubleshooting

### AccessDeniedException

If you see:
```
Error: AccessDeniedException: User: arn:aws:iam::XXXX:user/XXXX is not authorized to perform: bedrock:InvokeModel on resource: arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-micro-v1:0
```

Solutions:
1. Verify your IAM policy has the proper permissions
2. Confirm you've been granted access to the Nova Micro model
3. Check if your AWS region is correct

### ThrottlingException

If you see:
```
Error: ThrottlingException: Rate exceeded
```

Solutions:
1. Add a delay between requests
2. Reduce the frequency of your requests
3. Contact AWS to request a quota increase

### ValidationException

If you see:
```
Error: ValidationException: Invalid request
```

Solutions:
1. Double-check your request format
2. Verify all required fields are present
3. Ensure values are within allowed ranges

## Building for Production

For a production environment, consider these enhancements:

### 1. Error Handling and Retries

```typescript
let retries = 0;
const maxRetries = 3;

async function makeRequest() {
  try {
    const response = await client.send(command);
    return response;
  } catch (error) {
    if (error.name === 'ThrottlingException' && retries < maxRetries) {
      retries++;
      const delay = Math.pow(2, retries) * 100; // Exponential backoff
      console.log(`Rate limited. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return makeRequest();
    }
    throw error;
  }
}
```

### 2. Managing Context Length

The Nova Micro model has a context window limit. To manage this:

```typescript
// Keep only the last N messages
if (messages.length > 10) {
  messages.splice(0, messages.length - 10);
}
```

### 3. Saving Conversation History

```typescript
const fs = require('fs');

// Save conversation to file
function saveConversation() {
  fs.writeFileSync('conversation.json', JSON.stringify(messages, null, 2));
}

// Load previous conversation
function loadConversation() {
  if (fs.existsSync('conversation.json')) {
    const data = fs.readFileSync('conversation.json', 'utf8');
    messages.push(...JSON.parse(data));
  }
}
```

## Next Steps: Toward the ChatBotBluePrint

This standalone test server provides a foundation for understanding AWS Bedrock integration. As you prepare to build the full chatbot platform outlined in the ChatBotBluePrint, focus on:

1. **Streaming Responses**: Modify the code to use `InvokeModelWithResponseStreamCommand` for streaming responses
2. **Authentication**: Implement the JWT-based authentication system
3. **Database Integration**: Connect to separate databases for authentication and accounting
4. **Credit Management**: Implement the pre-allocation credit model for streaming sessions
5. **Web Interface**: Build a web-based UI instead of the terminal interface

## Conclusion

You've successfully created a standalone test server for AWS Bedrock's Nova Micro model. This server provides a simple way to interact with the model and serves as a foundation for the more complex chatbot platform described in the ChatBotBluePrint.

As you move forward with the full implementation, you'll expand on these core concepts, adding features like streaming responses, user authentication, and credit management, while maintaining the separation of concerns through microservices architecture.

Would you like me to explain or break down any specific part of this code in more detail?