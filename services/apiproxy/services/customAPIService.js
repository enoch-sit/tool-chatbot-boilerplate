const axios = require('axios');

/**
 * Service to call your custom API endpoint (eduhk-api-ea.azure-api.net)
 * Updated to match your custom API's request/response format
 */
class CustomAPIService {
  constructor() {
    this.baseURL = process.env.CUSTOM_API_URL || 'https://eduhk-api-ea.azure-api.net';
    this.apiKey = process.env.CUSTOM_API_KEY;
    
    if (!this.baseURL) {
      throw new Error('CUSTOM_API_URL environment variable is required');
    }
    
    if (!this.apiKey) {
      console.warn('⚠️ CUSTOM_API_KEY not set. API calls may fail.');
    }
  }

  /**
   * Call your custom API endpoint (non-streaming)
   * @param {Object} request - The transformed request object
   * @returns {Object} - The response from your custom API
   */
  async callCustomAPI(request) {
    try {
      const config = {
        method: 'POST',
        url: `${this.baseURL}/chatgpt/v1/completions`, // Your API endpoint
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey // Your API uses 'api-key' header
        },
        data: request,
        timeout: 30000 // 30 second timeout
      };

      console.log('Calling custom API:', {
        url: config.url,
        method: config.method,
        hasAuth: !!this.apiKey,
        streaming: false
      });

      const response = await axios(config);
      
      console.log('Custom API response status:', response.status);
      return response.data;
      
    } catch (error) {
      console.error('Custom API Error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });

      // Transform axios error to a more generic error format
      const customError = new Error(
        error.response?.data?.message || 
        error.response?.data?.error?.message || 
        error.message || 
        'Custom API request failed'
      );
      
      customError.status = error.response?.status || 500;
      customError.code = error.response?.data?.code || 
                        error.response?.data?.error?.code || 
                        'CustomAPIError';
      
      throw customError;
    }
  }

  /**
   * Call your custom API endpoint with streaming support
   * @param {Object} request - The transformed request object
   * @param {Function} onChunk - Callback function for each streaming chunk
   */
  async callCustomAPIStream(request, onChunk) {
    try {
      const config = {
        method: 'POST',
        url: `${this.baseURL}/chatgpt/v1/completions`, // Your API streaming endpoint
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey // Your API uses 'api-key' header
        },
        data: { ...request, stream: true },
        responseType: 'stream',
        timeout: 60000 // 60 second timeout for streaming
      };

      console.log('Calling custom API (streaming):', {
        url: config.url,
        method: config.method,
        hasAuth: !!this.apiKey,
        streaming: true
      });

      const response = await axios(config);
      
      console.log('Custom API streaming response started, status:', response.status);
      
      return new Promise((resolve, reject) => {
        let buffer = '';
        
        response.data.on('data', (chunk) => {
          buffer += chunk.toString();
          
          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop(); // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.trim() === '') continue;
            
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              
              if (data.trim() === '[DONE]') {
                resolve();
                return;
              }
              
              try {
                const parsed = JSON.parse(data);
                onChunk(parsed);
              } catch (parseError) {
                console.warn('Failed to parse streaming chunk:', data);
              }
            }
          }
        });
        
        response.data.on('end', () => {
          resolve();
        });
        
        response.data.on('error', (error) => {
          reject(error);
        });
      });
      
    } catch (error) {
      console.error('Custom API Streaming Error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });

      const customError = new Error(
        error.response?.data?.message || 
        error.response?.data?.error?.message || 
        error.message || 
        'Custom API streaming request failed'
      );
      
      customError.status = error.response?.status || 500;
      customError.code = error.response?.data?.code || 
                        error.response?.data?.error?.code || 
                        'CustomAPIStreamError';
      
      throw customError;
    }
  }
}

// Create singleton instance
const customAPIService = new CustomAPIService();

/**
 * Simple wrapper for different endpoint calls
 */
async function callCustomAPI(endpoint, method = 'POST', data = null) {
  const config = {
    method,
    url: `${customAPIService.baseURL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      'api-key': customAPIService.apiKey
    },
    ...(data && { data }),
    timeout: 30000
  };

  const response = await axios(config);
  return response.data;
}

/**
 * Simple wrapper for streaming calls  
 */
async function callCustomAPIStreaming(endpoint, data, onChunk) {
  return customAPIService.callCustomAPIStream(data, onChunk);
}

module.exports = {
  // Export class methods
  callCustomAPI: (request) => customAPIService.callCustomAPI(request),
  callCustomAPIStream: (request, onChunk) => customAPIService.callCustomAPIStream(request, onChunk),
  // Export simple wrappers for the azureProxy route
  callCustomAPIStreaming
};
