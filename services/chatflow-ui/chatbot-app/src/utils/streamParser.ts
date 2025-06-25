// File: chatbot-app/src/utils/streamParser.ts
import { StreamEvent } from '../types/chat';

/**
 * A class to process a stream of concatenated JSON objects.
 * The stream is expected to be a series of JSON objects without any delimiters.
 * e.g., {"event":"start"}{"event":"chunk", "data":"hello"}{"event":"end"}
 */
export class StreamParser {
  private buffer: string = '';
  private onData: (data: StreamEvent) => void;
  private onError: (err: Error) => void;

  constructor(onData: (data: StreamEvent) => void, onError: (err: Error) => void) {
    this.onData = onData;
    this.onError = onError;
  }

  /**
   * Appends a new chunk of data to the internal buffer and processes it.
   * @param chunk The string chunk received from the stream.
   */
  public processChunk(chunk: string): void {
    this.buffer += chunk;
    this.parse();
  }

  /**
   * Attempts to parse JSON objects from the buffer.
   * It finds the boundaries of each JSON object and parses it.
   */
  private parse(): void {
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
            this.onData(parsed as StreamEvent);
          } catch (e) {
            this.onError(new Error(`Failed to parse JSON object: ${objectStr}`));
          }
          // Reset start index for the next object
          startIndex = -1;
        }
      }
    }

    // Keep the remaining part of the buffer that couldn't be parsed
    if (startIndex !== -1) {
      this.buffer = this.buffer.substring(startIndex);
    } else {
      // Clear buffer if no partial object is left
      this.buffer = '';
    }
  }
}
