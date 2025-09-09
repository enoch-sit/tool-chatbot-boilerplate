// filepath: c:\\Users\\user\\Documents\\ThankGodForJesusChrist\\ThankGodForTools\\tool-chatbot-boilerplate\\services\\chat-service\\src\\controllers\\chat.utils.ts
import config from '../config/config';
import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelCommandOutput } from '@aws-sdk/client-bedrock-runtime';

export interface MessageContent {
  text: string;
  [key: string]: any;
}

export interface ChatMessage {
  role: string;
  content: string | MessageContent | MessageContent[];
}

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\\\]\\\\]/g, '\\\\$&'); // $& means the whole matched string
}

export const bedrockClient = new BedrockRuntimeClient({
  region: config.awsRegion,
  credentials: {
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey
  }
});

// Re-exporting these for convenience if other controllers need them directly with bedrockClient
export { InvokeModelCommand };
export type { InvokeModelCommandOutput };
