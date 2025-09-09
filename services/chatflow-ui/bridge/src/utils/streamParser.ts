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
    // Split the buffer by looking for complete JSON objects
    // Use a more robust approach that looks for "}{"" patterns to separate objects
    let startIndex = 0;

    // First, let's find all complete JSON objects in the buffer
    const jsonObjects: string[] = [];
    let braceLevel = 0;
    let currentObjectStart = -1;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < this.buffer.length; i++) {
      const char = this.buffer[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\' && inString) {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') {
          if (braceLevel === 0) {
            currentObjectStart = i;
          }
          braceLevel++;
        } else if (char === '}') {
          braceLevel--;
          if (braceLevel === 0 && currentObjectStart !== -1) {
            // We found a complete JSON object
            const jsonString = this.buffer.substring(currentObjectStart, i + 1);
            jsonObjects.push(jsonString);
            startIndex = i + 1;
            currentObjectStart = -1;
          }
        }
      }
    }

    // Process all complete JSON objects
    for (const jsonString of jsonObjects) {
      try {
        const parsed = JSON.parse(jsonString);
        this.handleParsedEvent(parsed);
      } catch (error) {
        this.onError(new Error(`Failed to parse JSON: ${jsonString}`));
      }
    }

    // Keep remaining buffer (incomplete JSON object) for next chunk
    if (currentObjectStart !== -1) {
      this.buffer = this.buffer.substring(currentObjectStart);
    } else {
      this.buffer = this.buffer.substring(startIndex);
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