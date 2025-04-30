### Key Points

- A simple standalone chat server in TypeScript can interact with AWS Bedrock’s Amazon Nova Micro (`amazon.nova-micro-v1:0`) model, a text-only LLM optimized for low latency and cost.
- The server runs in the terminal, allowing users to input text and receive responses, maintaining conversation history for context.
- Setup requires Node.js, TypeScript, the AWS SDK for JavaScript v3, AWS credentials, and model access, which may need AWS approval.
- The `InvokeModel` API is used, with a specific request body format for Nova Micro, differing from other models like Claude.
- This guide is designed for beginners, offering clear setup steps and a complete TypeScript script.

### Overview

To test and evaluate the AWS Bedrock LLM endpoint with the Amazon Nova Micro model, you can create a TypeScript-based chat server that runs in your terminal. It accepts user input, sends it to the Nova Micro model via the `InvokeModel` API, and displays the response. The server is standalone, requiring no web interface, making it ideal for newbie programmers.

### Setup Instructions

1. **Install Node.js**:
   - Download and install Node.js from [nodejs.org](https://nodejs.org).
   - Verify with `node --version` in your terminal.
2. **Install TypeScript**:
   - Run `npm install -g typescript` in your terminal.
   - Confirm with `tsc --version`.
3. **Create a Project**:
   - Create a new directory (e.g., `bedrock-nova-chat`) and navigate to it.
   - Run `npm init -y` to generate a `package.json` file.
   - Install dependencies with `npm install @aws-sdk/client-bedrock-runtime @types/node`.
4. **Configure AWS Credentials**:
   - Sign up for an AWS account at [aws.amazon.com](https://aws.amazon.com).
   - Create an IAM user with programmatic access and attach a policy like:

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

   - Run `aws configure` and enter your access key, secret key, region (e.g., `us-east-1`), and output format (`json`).
5. **Request Model Access**:
   - In the AWS Management Console, go to Amazon Bedrock > Model access.
   - Request access to Amazon Nova Micro and wait for approval (may take hours or days).
6. **Run the Server**:
   - Save the provided TypeScript code as `bedrock_nova_chat.ts`.
   - Compile with `tsc bedrock_nova_chat.ts`.
   - Run with `node bedrock_nova_chat.js`.

### Running the Chat Server

After setup, run the server using `node bedrock_nova_chat.js`. Type messages in the terminal, and the server will display the model’s responses. Type `quit` to exit.

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
      console.log("" + reply);
      messages.push({ role: 'assistant', content: reply });
    } catch (error) {
      console.error("Error:", error);
    }
    chatLoop();
  });
}

chatLoop();
```

### InvokeModel API Overview

The chat server uses the `InvokeModel` API to send prompts to the Nova Micro model and receive text responses. The request body is tailored for Nova models, and the response contains the generated text in a specific format. For details, see the [InvokeModel API Reference](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html).

---

### Comprehensive Guide to Building a TypeScript Chat Server for AWS Bedrock with Amazon Nova Micro

This guide provides a detailed walkthrough for creating a standalone chat server in TypeScript to test and evaluate the AWS Bedrock LLM endpoint using the Amazon Nova Micro model (`amazon.nova-micro-v1:0`). It is tailored for newbie programmers, including a complete TypeScript script, setup instructions, and documentation for the `InvokeModel` API endpoint.

#### Introduction to AWS Bedrock and Amazon Nova Micro

Amazon Bedrock is a fully managed service that provides access to high-performing foundation models, including large language models (LLMs) from providers like Amazon, Anthropic, and Meta, through a unified API. It supports tasks such as text generation, image creation, and embeddings, making it ideal for building generative AI applications. The Amazon Nova Micro model, part of Amazon’s Nova family, is a text-only LLM optimized for low latency and cost, supporting up to 128,000 input tokens. It excels in real-time analysis and interactive chatbots, as noted in the [Amazon Nova Announcement](https://aws.amazon.com/blogs/aws/introducing-amazon-nova-frontier-intelligence-and-industry-leading-price-performance/). This chat server uses the `InvokeModel` API to interact with Nova Micro, creating a terminal-based chat interface.

#### Setup Guide for Beginners

To get started, set up your environment and AWS account as follows:

1. **Install Node.js**:
   - Download Node.js from [nodejs.org](https://nodejs.org) and install it.
   - Verify installation with `node --version` in your terminal.
2. **Install TypeScript**:
   - Run `npm install -g typescript` to install TypeScript globally.
   - Confirm with `tsc --version`.
3. **Create a Project**:
   - Create a new directory (e.g., `bedrock-nova-chat`) and navigate to it.
   - Initialize a Node.js project with `npm init -y`.
   - Install the AWS SDK for JavaScript v3 with `npm install @aws-sdk/client-bedrock-runtime`.
   - Install TypeScript types for Node.js with `npm install --save-dev @types/node`.
4. **Configure AWS Credentials**:
   - **Create an AWS Account**: Sign up at [aws.amazon.com](https://aws.amazon.com) and complete verification.
   - **Set Up an IAM User**:
     - In the AWS Management Console, navigate to IAM > Users > Add user.
     - Create a user with programmatic access, generating an access key and secret key.
     - Attach a policy allowing `bedrock:InvokeModel` for Nova Micro:

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

   - **Configure Credentials**:
     - Run `aws configure` in your terminal.
     - Enter your access key, secret key, default region (e.g., `us-east-1`), and output format (`json`).
5. **Request Model Access**:
   - In the AWS Management Console, go to Amazon Bedrock > Model access.
   - Request access to Amazon Nova Micro (`amazon.nova-micro-v1:0`).
   - Wait for AWS approval, which may take hours or days, as noted in the [Supported Foundation Models](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html).
6. **Choose a Region**:
   - Nova Micro is available in regions like `us-east-1`, `us-west-2`, and others, as listed in the [Supported Foundation Models](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html). This guide uses `us-east-1`, but you can modify the region in the script if needed.

#### Chat Server Implementation

The chat server is a TypeScript script that runs in the terminal, allowing users to input messages, send them to the Nova Micro model, and view responses. It maintains conversation history by storing messages and including them in each API request. Below is the script, wrapped in an artifact tag.

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
      console.log("" + reply);
      messages.push({ role: 'assistant', content: reply });
    } catch (error) {
      console.error("Error:", error);
    }
    chatLoop();
  });
}

chatLoop();
```

**How It Works**:

- **Initialization**: Sets up a Bedrock runtime client in `us-east-1` and specifies the Nova Micro model ID (`amazon.nova-micro-v1:0`).
- **Conversation Loop**:
  - Prompts for user input using the `readline` module.
  - Exits if the user types `quit`.
  - Adds user input as a `user` role message to the `messages` array.
  - Constructs a JSON request body with `schemaVersion`, `messages` (mapped to include `content` as an array of `{text: message}`), and `inferenceConfig`.
  - Sends the request to the `InvokeModel` API using `InvokeModelCommand`.
  - Parses the response to extract the assistant’s reply from `results[0].outputText` and prints it.
  - Adds the assistant’s reply as an `assistant` role message to the `messages` array.
- **Error Handling**: Catches exceptions (e.g., access denied, network issues) and displays an error message.

**Customization**:

- **Model ID**: Use `amazon.nova-micro-v1:0` for Nova Micro. Other Nova models (e.g., `amazon.nova-lite-v1:0`) may support multimodal inputs but require different handling.
- **Region**: Change `us-east-1` to another supported region, ensuring model availability.
- **Inference Parameters**: Adjust `maxTokens` (0–5000), `temperature` (0.00001–1), or `topP` (0–1) in `inferenceConfig` for different response lengths or creativity levels, as per the [Amazon Nova Models](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-nova.html).

#### InvokeModel API Documentation

The chat server relies on the `InvokeModel` API to interact with the Nova Micro model. Below is a detailed reference for this endpoint, tailored for beginners.

**Endpoint Details**:

- **URL**: [InvokeModel API](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html)
- **Method**: POST
- **Purpose**: Sends a prompt to the specified model and returns the generated response (text, images, or embeddings).
- **Permissions**: Requires `bedrock:InvokeModel` permission for the model’s ARN.

**Request Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `modelId` | String | Yes | The ID of the model, e.g., `amazon.nova-micro-v1:0`. |
| `body` | JSON | Yes | Contains the prompt and inference parameters, specific to the model. |
| `contentType` | String | Optional | MIME type of the input data (default: `application/json`). |
| `accept` | String | Optional | Desired response MIME type (default: `application/json`). |
| `guardrailIdentifier` | String | Optional | Identifier for content filtering guardrails. |
| `guardrailVersion` | String | Optional | Version of the guardrail (e.g., `DRAFT`). |
| `trace` | String | Optional | Enables tracing (`ENABLED`, `DISABLED`, `ENABLED_FULL`). |
| `performanceConfigLatency` | String | Optional | Latency setting (`standard`, `optimized`). |

**Request Body for Nova Micro**:

```json
{
  "schemaVersion": "messages-v1",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "text": "Hello"
        }
      ]
    },
    {
      "role": "assistant",
      "content": [
        {
          "text": "Hi! How can I assist you today?"
        }
      ]
    }
  ],
  "inferenceConfig": {
    "maxTokens": 1000,
    "temperature": 0.7,
    "topP": 0.9
  }
}
```

- `schemaVersion`: Specifies the message schema (`messages-v1` for Nova models).
- `messages`: Array of message objects with `role` (`user` or `assistant`) and `content` (array of `{text: string}` for text-only models like Nova Micro).
- `inferenceConfig`: Optional parameters:
  - `maxTokens`: 0–5000, controls response length.
  - `temperature`: 0.00001–1, default 0.7, controls randomness.
  - `topP`: 0–1, default 0.9, controls token sampling.
  - `stopSequences`: Array of strings to stop generation.
- Optional: `system` for system prompts (e.g., `[{"text": "You are a helpful assistant"}]`) to set context.

**Response Format**:

```json
{
  "inputTextTokenCount": 10,
  "results": [
    {
      "tokenCount": 20,
      "outputText": "Generated response",
      "completionReason": "FINISHED"
    }
  ]
}
```

- `inputTextTokenCount`: Number of tokens in the input prompt.
- `results`: Array with one object containing:
  - `tokenCount`: Number of tokens in the output.
  - `outputText`: The generated text response.
  - `completionReason`: `FINISHED`, `LENGTH`, `STOP_CRITERIA_MET`, or `CONTENT_FILTERED`.
- Extract the response with `responseBody.results[0].outputText` in TypeScript.

**Errors**:

| Error | Status Code | Description |
|-------|-------------|-------------|
| `AccessDeniedException` | 403 | Missing permissions or model access. |
| `ValidationException` | 400 | Invalid request parameters or body format. |
| `ModelNotReadyException` | 429 | Model is not available; retries up to 5 times. |
| `ThrottlingException` | 429 | Rate limit exceeded. |
| `InternalServerException` | 500 | Server-side error. |

**Example TypeScript Code**:

```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: 'us-east-1' });
const requestBody = {
  schemaVersion: "messages-v1",
  messages: [{ role: "user", content: [{ text: "Hello" }] }],
  inferenceConfig: { maxTokens: 1000, temperature: 0.7, topP: 0.9 }
};
const command = new InvokeModelCommand({
  modelId: "amazon.nova-micro-v1:0",
  body: JSON.stringify(requestBody)
});
const response = await client.send(command);
const responseBody = JSON.parse(new TextDecoder().decode(response.body));
console.log(responseBody.results[0].outputText);
```

For more details, see the [Amazon Nova Models](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-nova.html) and [Using the Invoke API](https://docs.aws.amazon.com/nova/latest/userguide/using-invoke-api.html).

#### Available Models

Bedrock supports various LLMs, including the Nova family. Below is a subset of relevant models:

| Provider | Model Name | Model ID |
|----------|------------|----------|
| Amazon | Nova Micro | `amazon.nova-micro-v1:0` |
| Amazon | Nova Lite | `amazon.nova-lite-v1:0` |
| Amazon | Nova Pro | `amazon.nova-pro-v1:0` |
| Amazon | Titan Text G1 - Premier | `amazon.titan-text-premier-v1:0` |

For a complete list, refer to the [Supported Foundation Models](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html).

#### Notes and Limitations

- **Conversation History**: The script stores all messages, increasing token usage for long conversations. For production, consider truncating or summarizing history.
- **Model Access**: Nova Micro requires approval, and access may vary by region, as noted in the [Supported Foundation Models](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html).
- **Costs**: Bedrock charges based on tokens processed. Monitor usage in the AWS console to avoid unexpected costs.
- **Error Handling**: The script includes basic error handling. Enhance it for production with specific error checks (e.g., `AccessDeniedException`).
- **Text-Only Model**: Nova Micro supports only text inputs and outputs, unlike other Nova models that handle multimodal inputs, as per the [Amazon Nova Announcement](https://aws.amazon.com/blogs/aws/introducing-amazon-nova-frontier-intelligence-and-industry-leading-price-performance/).
- **Alternative APIs**: The Converse API offers a unified interface for conversational tasks but is not used here for simplicity. See [Converse API](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html).

#### Testing and Evaluation

To evaluate the Nova Micro model:

- **Response Quality**: Test various prompts to assess accuracy and coherence.
- **Performance**: Measure response time by adding timing code (e.g., `const start = Date.now(); ...; console.log(Date.now() - start)`).
- **Error Handling**: Test with invalid inputs or exceed rate limits to ensure graceful error handling.
- **Comparison**: Modify the `modelId` to test other models (e.g., Nova Lite) and compare performance, ensuring the request body is adjusted accordingly.

This chat server provides a simple yet effective way to interact with the Amazon Nova Micro model, making it an excellent tool for beginners to explore generative AI capabilities in AWS Bedrock.

### Key Citations

- [Supported Foundation Models in Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html)
- [Amazon Nova Models Parameters](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-nova.html)
- [InvokeModel API Reference](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html)
- [Using the Invoke API for Amazon Nova](https://docs.aws.amazon.com/nova/latest/userguide/using-invoke-api.html)
- [Amazon Nova Foundation Models Announcement](https://aws.amazon.com/blogs/aws/introducing-amazon-nova-frontier-intelligence-and-industry-leading-price-performance/)
- [Amazon Titan Text Models Parameters](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-titan-text.html)
- [Amazon Bedrock General Information](https://aws.amazon.com/bedrock/)
- [Amazon Nova Samples GitHub Repository](https://github.com/aws-samples/amazon-nova-samples)
- [Getting Started with Amazon Nova](https://docs.aws.amazon.com/nova/latest/userguide/getting-started.html)
- [Amazon Nova Overview](https://aws.amazon.com/ai/generative-ai/nova/)
- [Amazon Nova Models Availability](https://aws.amazon.com/about-aws/whats-new/2024/12/amazon-nova-foundation-models-bedrock/)
- [Amazon Nova Prompt Engineering](https://www.datacamp.com/tutorial/amazon-nova)
- [Amazon Bedrock FAQs](https://aws.amazon.com/bedrock/faqs/)
- [Amazon Bedrock Models as of 2024](https://hidekazu-konishi.com/entry/amazon_bedrock_models_as_of_2024.html)
