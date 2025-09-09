// filepath: c:\Users\user\Documents\ThankGodForJesusChrist\ThankGodForTools\tool-chatbot-boilerplate\services\chat-service\src\types\chat.types.ts
export interface MessageContent {
  text: string;
  [key: string]: any; // Allow for additional properties
}

export interface ChatMessage {
  role: string;
  content: string | MessageContent | MessageContent[];
  timestamp?: Date; // Added timestamp as it's used in messages
}
