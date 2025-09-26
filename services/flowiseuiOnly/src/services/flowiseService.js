import { FlowiseClient } from 'flowise-sdk';

// FlowiseAI API Service with SDK Integration
class FlowiseService {
  constructor() {
    // Configuration from environment variables
    this.baseUrl = import.meta.env.VITE_FLOWISE_BASE_URL || "https://project-1-13.eduhk.hk";
    this.chatflowId = import.meta.env.VITE_FLOWISE_CHATFLOW_ID || "415615d3-ee34-4dac-be19-f8a20910f692";
    
    // Authentication configuration (if needed)
    this.apiKey = import.meta.env.VITE_FLOWISE_API_KEY;
    this.username = import.meta.env.VITE_FLOWISE_USERNAME;
    this.password = import.meta.env.VITE_FLOWISE_PASSWORD;
    
    // Initialize FlowiseClient with authentication if available
    const clientConfig = { baseUrl: this.baseUrl };
    
    // FlowiseAI uses Bearer token authentication for chatflows
    if (this.apiKey) {
      // Ensure Bearer token format for FlowiseAI
      clientConfig.apiKey = this.apiKey;
      console.log('Using API Key authentication (Bearer token)');
    } else if (this.username && this.password) {
      // Fallback to basic auth if configured
      clientConfig.auth = {
        username: this.username,
        password: this.password
      };
      console.log('Using Basic authentication');
    } else {
      console.log('No authentication configured - using public access');
    }
    
    this.client = new FlowiseClient(clientConfig);
    
    // Fallback URL for direct fetch calls
    this.directUrl = `${this.baseUrl}/api/v1/prediction/${this.chatflowId}`;
    
    console.log('FlowiseService initialized:', {
      baseUrl: this.baseUrl,
      chatflowId: this.chatflowId,
      hasApiKey: !!this.apiKey,
      hasAuth: !!(this.username && this.password)
    });
  }

  // Helper method to get authentication headers for FlowiseAI
  getAuthHeaders() {
    const headers = {
      "Content-Type": "application/json",
      "Accept": "text/event-stream"
    };
    
    // FlowiseAI uses Bearer token authentication for chatflows
    if (this.apiKey) {
      // Ensure proper Bearer token format
      const token = this.apiKey.startsWith('Bearer ') ? this.apiKey : `Bearer ${this.apiKey}`;
      headers["Authorization"] = token;
    } else if (this.username && this.password) {
      // Fallback to Basic auth if configured
      headers["Authorization"] = `Basic ${btoa(`${this.username}:${this.password}`)}`;
    }
    
    return headers;
  }

  // SDK-based streaming method
  async streamMessageWithSDK(question, history = [], options = {}, callbacks = {}) {
    const {
      onStart = () => {},
      onToken = () => {},
      onMetadata = () => {},
      onEnd = () => {},
      onError = () => {},
      onSourceDocuments = () => {},
      onUsedTools = () => {}
    } = callbacks;

    let fullResponse = '';
    let metadata = null;

    try {
      onStart();

      const prediction = await this.client.createPrediction({
        chatflowId: this.chatflowId,
        question,
        history,
        streaming: true,
        ...options
      });

      for await (const chunk of prediction) {
        console.log('SDK Chunk:', chunk);
        
        // Handle different event types based on observed FlowiseAI events
        switch (chunk.event) {
          case 'start':
            console.log('Streaming started');
            onStart();
            break;
            
          case 'token':
            // Main content streaming - concatenate tokens
            if (chunk.data) {
              fullResponse += chunk.data;
              onToken(chunk.data, fullResponse);
            }
            break;
            
          case 'metadata':
            // Session metadata (chatId, messageId, etc.)
            metadata = chunk.data;
            onMetadata(chunk.data);
            break;
            
          case 'end':
            // Stream completion
            console.log('Streaming finished');
            onEnd(fullResponse, metadata);
            break;
            
          case 'error':
            console.error('Stream error:', chunk.data);
            onError(chunk.data);
            break;
            
          case 'sourceDocuments':
            onSourceDocuments(chunk.data);
            break;
            
          case 'usedTools':
          case 'calledTools':
            // Tool usage information
            onUsedTools(chunk.data);
            break;
            
          case 'agentFlowEvent':
            // Agent workflow status (INPROGRESS, FINISHED)
            console.log('Agent Flow Status:', chunk.data);
            break;
            
          case 'nextAgentFlow':
            // Individual workflow node status
            console.log('Next Agent Flow:', chunk.data);
            break;
            
          case 'agentFlowExecutedData':
            // Detailed execution data for workflow nodes
            console.log('Agent Flow Executed:', chunk.data);
            break;
            
          case 'usageMetadata':
            // Usage statistics and metadata
            console.log('Usage Metadata:', chunk.data);
            break;
            
          default:
            // Log unknown events but don't treat as content
            console.log('Unknown streaming event:', chunk.event, chunk.data);
        }
      }

      return {
        text: fullResponse,
        metadata,
        question
      };
    } catch (error) {
      console.error('SDK streaming error:', error);
      
      // Handle authentication errors specifically
      if (error.status === 401 || error.status === 403) {
        const authError = new Error('Authentication failed. Please check your FlowiseAI API key or credentials.');
        authError.isAuthError = true;
        onError(authError);
        throw authError;
      }
      
      onError(error);
      throw error;
    }
  }

  // Fallback streaming method using direct fetch
  async streamMessageWithFetch(question, history = [], options = {}, callbacks = {}) {
    const {
      onStart = () => {},
      onToken = () => {},
      onMetadata = () => {},
      onEnd = () => {},
      onError = () => {},
      onSourceDocuments = () => {},
      onUsedTools = () => {}
    } = callbacks;

    let fullResponse = '';
    let metadata = null;

    try {
      onStart();

      const response = await fetch(this.directUrl, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          question,
          history,
          streaming: true,
          ...options
        })
      });

      if (!response.ok) {
        // Handle authentication errors specifically
        if (response.status === 401 || response.status === 403) {
          const authError = new Error('Authentication failed. Please check your FlowiseAI API key or credentials.');
          authError.isAuthError = true;
          throw authError;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;
            
            let eventType = '';
            let eventData = '';
            
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
              continue;
            }
            
            if (line.startsWith('data: ')) {
              eventData = line.slice(6);
              
              if (eventData.trim() === '[DONE]') {
                onEnd(fullResponse, metadata);
                return { text: fullResponse, metadata, question };
              }

              try {
                const parsed = JSON.parse(eventData);
                
                switch (eventType || 'token') {
                  case 'start':
                    onStart();
                    break;
                  case 'token':
                    if (parsed.data !== undefined) {
                      fullResponse += parsed.data;
                      onToken(parsed.data, fullResponse);
                    } else if (typeof parsed === 'string') {
                      fullResponse += parsed;
                      onToken(parsed, fullResponse);
                    }
                    break;
                  case 'metadata':
                    metadata = parsed;
                    onMetadata(parsed);
                    break;
                  case 'end':
                    onEnd(fullResponse, metadata);
                    break;
                  case 'error':
                    onError(parsed);
                    break;
                  case 'sourceDocuments':
                    onSourceDocuments(parsed);
                    break;
                  case 'usedTools':
                  case 'calledTools':
                    onUsedTools(parsed);
                    break;
                  case 'agentFlowEvent':
                    console.log('Agent Flow Status:', parsed);
                    break;
                  case 'nextAgentFlow':
                    console.log('Next Agent Flow:', parsed);
                    break;
                  case 'agentFlowExecutedData':
                    console.log('Agent Flow Executed:', parsed);
                    break;
                  case 'usageMetadata':
                    console.log('Usage Metadata:', parsed);
                    break;
                  default:
                    console.log('Unknown SSE event:', eventType, parsed);
                }
              } catch (e) {
                // Handle non-JSON data as raw text token
                if (eventData.trim()) {
                  fullResponse += eventData;
                  onToken(eventData, fullResponse);
                }
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      onEnd(fullResponse, metadata);
      return { text: fullResponse, metadata, question };

    } catch (error) {
      console.error('Fetch streaming error:', error);
      onError(error);
      throw error;
    }
  }

  // Main streaming method with fallback
  async streamMessage(question, history = [], options = {}, callbacks = {}) {
    console.log('Starting streaming request...');
    
    try {
      // Try SDK first
      return await this.streamMessageWithSDK(question, history, options, callbacks);
    } catch (sdkError) {
      console.warn('SDK streaming failed, falling back to fetch:', sdkError);
      
      try {
        // Fallback to direct fetch
        return await this.streamMessageWithFetch(question, history, options, callbacks);
      } catch (fetchError) {
        console.error('Both streaming methods failed:', { sdkError, fetchError });
        throw new Error('Streaming failed: ' + fetchError.message);
      }
    }
  }

  // Non-streaming methods (backward compatibility)
  async sendMessage(question, options = {}) {
    try {
      const result = await this.client.createPrediction({
        chatflowId: this.chatflowId,
        question,
        streaming: false,
        ...options
      });
      
      return result;
    } catch (error) {
      console.error('SDK non-streaming error, trying fallback:', error);
      
      // Fallback to direct fetch
      return await this.query({
        question,
        streaming: false,
        ...options
      });
    }
  }

  async sendMessageWithHistory(question, history = [], options = {}) {
    try {
      const result = await this.client.createPrediction({
        chatflowId: this.chatflowId,
        question,
        history,
        streaming: false,
        ...options
      });
      
      return result;
    } catch (error) {
      console.error('SDK non-streaming with history error, trying fallback:', error);
      
      // Fallback to direct fetch
      return await this.query({
        question,
        history,
        streaming: false,
        ...options
      });
    }
  }

  // Direct fetch fallback method
  async query(data) {
    try {
      const headers = this.getAuthHeaders();
      // Remove Accept header for non-streaming requests
      delete headers["Accept"];
      
      const response = await fetch(this.directUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
          const authError = new Error('Authentication failed. Please check your FlowiseAI API key or credentials.');
          authError.isAuthError = true;
          throw authError;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error in direct query:', error);
      throw error;
    }
  }
}

export default new FlowiseService();