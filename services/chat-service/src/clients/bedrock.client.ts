// filepath: c:\Users\user\Documents\ThankGodForJesusChrist\ThankGodForTools\tool-chatbot-boilerplate\services\chat-service\src\clients\bedrock.client.ts
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import config from '../config/config';

// Initialize AWS Bedrock client
export const bedrockClient = new BedrockRuntimeClient({ 
  region: config.awsRegion,
  credentials: {
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey
  }
});