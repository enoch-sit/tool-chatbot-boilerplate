// src/utils/streamParser.ts

// [PROGRESS] This file is new and central to handling event-based streams.
// See: merge-guide-gemini.md#4-robust-stream-handling

/**
 * Represents a single event from the Flowise-like streaming API.
 */
export interface StreamEvent {
  event: string;
  data: any;
  // Optional fields that might appear in specific events
  nodeId?: string;
  nodeLabel?: string;
  status?: 'INPROGRESS' | 'FINISHED';
}

/**
 * A utility class to parse a concatenated JSON stream from the API.
 * It handles incomplete JSON objects at the end of each chunk.
 */
export class StreamProcessor {
  private buffer = '';

  /**
   * Processes a chunk of text from the stream and yields complete event objects.
   * @param chunk A string chunk from the ReadableStream.
   */
  *process(chunk: string): Generator<StreamEvent> {
    this.buffer += chunk;

    // Process the buffer until no complete JSON object can be parsed.
    while (true) {
      const result = this.extractNextObject();
      if (result.object) {
        yield result.object;
      } else {
        // If no object could be extracted, break the loop and wait for more data.
        break;
      }
    }
  }

  /**
   * Tries to find and parse the next complete JSON object from the buffer.
   * It looks for a balanced number of curly braces.
   * @returns An object containing the parsed JSON object (if found) and the remaining buffer.
   */
  private extractNextObject(): { object: StreamEvent | null; } {
    let braceCount = 0;
    let startIndex = -1;
    let endIndex = -1;

    // Find the start of a JSON object
    for (let i = 0; i < this.buffer.length; i++) {
      if (this.buffer[i] === '{') {
        startIndex = i;
        braceCount = 1;
        break;
      }
    }

    // If no '{' is found, no object can be parsed.
    if (startIndex === -1) {
      return { object: null };
    }

    // Find the corresponding closing brace
    for (let i = startIndex + 1; i < this.buffer.length; i++) {
      if (this.buffer[i] === '{') {
        braceCount++;
      } else if (this.buffer[i] === '}') {
        braceCount--;
      }

      if (braceCount === 0) {
        endIndex = i;
        break;
      }
    }

    // If the object is not complete (no closing brace found), wait for more data.
    if (endIndex === -1) {
      return { object: null };
    }

    const objectStr = this.buffer.substring(startIndex, endIndex + 1);
    this.buffer = this.buffer.substring(endIndex + 1);

    try {
      const parsedObject = JSON.parse(objectStr);
      return { object: parsedObject as StreamEvent };
    } catch (e) {
      // This can happen if the extracted string is not valid JSON.
      // We'll log it and continue, which might discard the malformed part.
      console.error('Failed to parse stream object:', objectStr, e);
      return { object: null };
    }
  }
}
