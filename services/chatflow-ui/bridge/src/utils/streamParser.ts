// src/utils/streamParser.ts
import type { StreamEvent } from '../types/chat';

export class StreamParser {
  private buffer: string = '';
  private onData: (data: StreamEvent) => void;
  private onError: (err: Error) => void;

  constructor(onData: (data: StreamEvent) => void, onError: (err: Error) => void) {
    this.onData = onData;
    this.onError = onError;
  }

  public processChunk(chunk: string): void {
    this.buffer += chunk;
    this.parseEvents();
  }

  private parseEvents(): void {
    let braceCount = 0;
    let startIndex = -1;

    for (let i = 0; i < this.buffer.length; i++) {
      if (this.buffer[i] === '{') {
        if (braceCount === 0) {
          startIndex = i;
        }
        braceCount++;
      } else if (this.buffer[i] === '}') {
        braceCount--;
        if (braceCount === 0 && startIndex !== -1) {
          const objectStr = this.buffer.substring(startIndex, i + 1);
          try {
            const parsed = JSON.parse(objectStr);
            this.handleParsedEvent(parsed);
          } catch {
            this.onError(new Error(`Failed to parse JSON: ${objectStr}`));
          }
          startIndex = -1;
        }
      }
    }

    // Keep remaining buffer for next chunk
    if (startIndex !== -1) {
      this.buffer = this.buffer.substring(startIndex);
    } else {
      this.buffer = '';
    }
  }

  private handleParsedEvent(event: any): void {
    // console.log('🎯 Parsed event:', event);
    
    // Handle the streaming structure shown in context [[4]][doc_4][[5]][doc_5]
    if (event.output?.content) {
      // console.log('📝 Content event:', event.output.content);
      this.onData({
        event: 'content',
        data: {
          content: event.output.content,
          timeMetadata: event.output.timeMetadata,
          usageMetadata: event.output.usageMetadata,
          calledTools: event.output.calledTools
        }
      });
    } else if (event.event) {
      // console.log('⚡ Stream event:', event.event, event.data);
      this.onData(event as StreamEvent);
    }
  }
}