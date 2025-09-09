# Example test

```ts
import { BedrockRuntimeClient, InvokeModelCommand, ConverseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import * as readline from 'readline';

// Set up Bedrock runtime client
const client = new BedrockRuntimeClient({ region: 'us-east-1' });

// Define the model ID
const modelId = 'amazon.nova-micro-v1:0';

// Define message type
type Message = { role: 'user' | 'assistant' | 'system'; content: string };

// Initialize messages list
const messages: Message[] = [];

// Set up readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("Welcome to the Bedrock Chat Server");
console.log("Type 'quit' to exit");
console.log("Type 'stream' to use streaming mode");
console.log("Type 'standard' to use standard mode");

// Variable to track which mode we're in
let useStreamingMode = false;

// Helper function to convert local messages to Converse API format
function toConverseMessages(messages: Message[]): any[] {
  return messages.map(m => ({
    role: m.role,
    content: [{ text: m.content }]
  }));
}

async function streamingChatLoop() {
  rl.question('User: ', async (inputText) => {
    if (inputText.toLowerCase() === 'quit') {
      rl.close();
      return;
    }
    
    if (inputText.toLowerCase() === 'standard') {
      console.log("Switching to standard mode");
      useStreamingMode = false;
      chatLoop();
      return;
    }
    
    messages.push({ role: 'user', content: inputText });
    
    try {
      console.log("Sending streaming request to AWS Bedrock...");
      
      // Convert all messages to Converse API format
      const converseMessages = toConverseMessages(messages);
      
      const request = { 
        modelId, 
        messages: converseMessages, 
        inferenceConfig: { 
          maxTokens: 1000, 
          temperature: 0.7 
        } 
      };
      
      console.log("Assistant: ");
      
      // Send streaming request and process chunks as they arrive
      const response = await client.send(new ConverseStreamCommand(request));
      let fullResponse = "";
      
      // Use non-null assertion to handle TypeScript error
      for await (const chunk of response.stream!) {
        if (chunk.contentBlockDelta) {
          const textChunk = chunk.contentBlockDelta.delta?.text || "";
          process.stdout.write(textChunk);
          fullResponse += textChunk;
        }
      }
      
      console.log("\n"); // Add a newline after response completes
      messages.push({ role: 'assistant', content: fullResponse });
    } catch (error: any) {
      console.error("Error:", error);
      
      // Check if this is a model access issue
      if (error.message && (
          error.message.includes("not authorized") || 
          error.message.includes("access denied") ||
          error.message.includes("AccessDeniedException"))) {
        console.log("\n⚠️ ACCESS PERMISSION ISSUE: You might not have access to the Nova Micro model yet.");
        console.log("Please visit the AWS Bedrock console and request model access in the 'Model access' section.");
      }
    }
    streamingChatLoop();
  });
}

async function chatLoop() {
  rl.question('User: ', async (input) => {
    if (input.toLowerCase() === 'quit') {
      rl.close();
      return;
    }
    
    if (input.toLowerCase() === 'stream') {
      console.log("Switching to streaming mode");
      useStreamingMode = true;
      streamingChatLoop();
      return;
    }
    
    messages.push({ role: 'user', content: input });
    
    // Updated format - removed top_p parameter that caused the error
    const novaMessages = messages.map(m => ({
      role: m.role,
      content: [{ text: m.content }]
    }));
    const requestBody = {
      schemaVersion: "messages-v1",
      messages: novaMessages,
      inferenceConfig: {
        maxTokens: 1000,
        temperature: 0.7
      }
    };
    
    try {
      console.log("Sending request to AWS Bedrock...");
      console.log("Request body:", JSON.stringify(requestBody, null, 2));
      
      const command = new InvokeModelCommand({
        modelId: modelId,
        body: JSON.stringify(requestBody),
        contentType: 'application/json',
        accept: 'application/json'
      });
      
      const response = await client.send(command);
      const responseText = new TextDecoder().decode(response.body);
      console.log("Raw response:", responseText);
      
      const responseBody = JSON.parse(responseText);
      
      // Handle different response formats
      let reply = "";
      // Handle Nova Micro response format
      if (responseBody.output && responseBody.output.message && responseBody.output.message.content) {
        // Extract text from the Nova response format
        reply = responseBody.output.message.content[0].text;
      }
      // Handle original formats as fallback
      else if (responseBody.content && responseBody.content[0] && responseBody.content[0].text) {
        reply = responseBody.content[0].text;
      } else if (responseBody.completion) {
        reply = responseBody.completion;
      } else if (responseBody.outputText) {
        reply = responseBody.outputText;
      } else {
        console.log("Unexpected response format:", JSON.stringify(responseBody, null, 2));
        reply = "Received response in unexpected format. See console for details.";
      }
      
      console.log("Assistant: " + reply);
      messages.push({ role: 'assistant', content: reply });
    } catch (error: any) {
      console.error("Error:", error);
      
      // Check if this is a model access issue
      if (error.message && (
          error.message.includes("not authorized") || 
          error.message.includes("access denied") ||
          error.message.includes("AccessDeniedException"))) {
        console.log("\n⚠️ ACCESS PERMISSION ISSUE: You might not have access to the Nova Micro model yet.");
        console.log("Please visit the AWS Bedrock console and request model access in the 'Model access' section.");
        console.log("Alternatively, try a different model like Claude Instant by uncommenting the alternative modelId line.");
      }
      
      // Check for format errors
      if (error.message && error.message.includes("Malformed input request")) {
        console.log("\n⚠️ FORMAT ISSUE: The request format is incorrect.");
        
        // Try an alternative format based on error message
        if (error.message.includes("required key")) {
          const missingKey = error.message.match(/required key \[(.*?)\]/);
          if (missingKey && missingKey[1]) {
            console.log(`Missing required key: ${missingKey[1]}`);
          }
        } else if (error.message.includes("extraneous key")) {
          const extraKey = error.message.match(/extraneous key \[(.*?)\]/);
          if (extraKey && extraKey[1]) {
            console.log(`Remove this parameter: ${extraKey[1]}`);
          }
        }
      }
    }
    chatLoop();
  });
}

// Start with standard mode
chatLoop();

```