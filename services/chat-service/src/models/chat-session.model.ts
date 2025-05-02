import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface IChatSession extends Document {
  _id: string;
  userId: string;
  title: string;
  messages: IMessage[];
  modelId: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    streamingSessionId?: string;
    lastTokensUsed?: number;
    totalTokensUsed?: number;
    activeStreamingSession?: boolean;
    [key: string]: any;
  };
}

const ChatSessionSchema = new Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  messages: [{
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  modelId: { type: String, required: true, default: 'anthropic.claude-3-sonnet-20240229-v1:0' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, { 
  timestamps: true, 
  collection: 'chat_sessions' 
});

// Create indexes for better query performance
ChatSessionSchema.index({ userId: 1, createdAt: -1 });
ChatSessionSchema.index({ 'metadata.streamingSessionId': 1 });

export default mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);