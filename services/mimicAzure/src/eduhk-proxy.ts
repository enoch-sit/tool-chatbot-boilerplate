import https = require('https');
import { URL } from 'url';

// EdUHK API Configuration
const EDUHK_ENDPOINT = 'https://eduhk-api-ea.azure-api.net/chatgpt/v1/completion';
const EDUHK_API_KEY = process.env.EDUHK_API_KEY || 'Xt7X91234567123456712345672344vT';

// Transform Azure OpenAI request to EdUHK format
export function reformatRequest(azureRequest: any): any {
  const { messages, model, temperature, stream, stream_options } = azureRequest;
  
  // Transform messages to EdUHK format (with content array)
  const transformedMessages = messages.map((msg: any) => {
    if (typeof msg.content === 'string') {
      // Convert simple string content to array format
      return {
        role: msg.role,
        content: [
          {
            type: 'text',
            text: msg.content
          }
        ]
      };
    } else if (Array.isArray(msg.content)) {
      // Already in correct format
      return msg;
    } else {
      // Fallback for other formats
      return {
        role: msg.role,
        content: [
          {
            type: 'text',
            text: JSON.stringify(msg.content)
          }
        ]
      };
    }
  });

  // EdUHK request format
  return {
    model: 'gpt-4o-mini',
    messages: transformedMessages,
    stream: stream || false,
    ...(temperature && { temperature }),
    ...(stream_options && { stream_options })
  };
}

// Transform EdUHK streaming response to Azure format
export function reformatStreamResponse(eduhkChunk: string): string | null {
  if (!eduhkChunk.startsWith('data:')) {
    return null;
  }

  if (eduhkChunk.includes('[DONE]')) {
    return 'data: [DONE]\n\n';
  }

  try {
    const jsonStr = eduhkChunk.replace('data:', '').trim();
    const eduhkData = JSON.parse(jsonStr);

    // Transform to Azure OpenAI format
    const azureData = {
      choices: eduhkData.choices?.map((choice: any) => ({
        content_filter_results: choice.content_filter_results || {
          hate: { filtered: false, severity: "safe" },
          self_harm: { filtered: false, severity: "safe" },
          sexual: { filtered: false, severity: "safe" },
          violence: { filtered: false, severity: "safe" }
        },
        delta: choice.delta || {},
        finish_reason: choice.finish_reason,
        index: choice.index || 0,
        logprobs: choice.logprobs
      })) || [],
      created: eduhkData.created || Math.floor(Date.now() / 1000),
      id: eduhkData.id || '',
      model: eduhkData.model || 'gpt-4.1-2025-04-14',
      object: eduhkData.object || 'chat.completion.chunk',
      system_fingerprint: eduhkData.system_fingerprint || `fp_${Math.random().toString(36).substring(2, 12)}`,
      ...(eduhkData.usage && { usage: eduhkData.usage }),
      ...(eduhkData.prompt_filter_results && { prompt_filter_results: eduhkData.prompt_filter_results })
    };

    return `data: ${JSON.stringify(azureData)}\n\n`;
  } catch (error) {
    console.error('Error parsing EdUHK response:', error);
    return null;
  }
}

// Send request to EdUHK API
export function sendToEdUHK(requestData: any, onData: (chunk: string) => void, onEnd: () => void, onError: (error: Error) => void): void {
  const url = new URL(EDUHK_ENDPOINT);
  const postData = JSON.stringify(requestData);

  console.log('🌍 Forwarding request to EdUHK API...');
  console.log('📡 Endpoint:', EDUHK_ENDPOINT);
  console.log('📦 Request:', JSON.stringify(requestData, null, 2));
  console.log('🔑 API Key being used:', EDUHK_API_KEY);

  const options = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'api-key': EDUHK_API_KEY,
      'User-Agent': 'Azure-OpenAI-Proxy/1.0'
    }
  };

  console.log('📋 Request options:', JSON.stringify(options, null, 2));

  const req = https.request(options, (res) => {
    console.log(`📊 EdUHK Response Status: ${res.statusCode}`);
    console.log(`📋 EdUHK Response Headers:`, res.headers);

    res.setEncoding('utf8');
    
    let buffer = '';
    res.on('data', (chunk) => {
      buffer += chunk;
      
      // Process complete lines for streaming
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      lines.forEach(line => {
        if (line.trim()) {
          console.log('📥 EdUHK chunk:', line);
          onData(line.trim());
        }
      });
    });

    res.on('end', () => {
      // Process any remaining data in buffer
      if (buffer.trim()) {
        console.log('📥 EdUHK final chunk:', buffer);
        onData(buffer.trim());
      }
      console.log('✅ EdUHK response completed');
      onEnd();
    });
  });

  req.on('error', (error) => {
    console.error('❌ EdUHK request error:', error);
    onError(error);
  });

  req.setTimeout(60000, () => {
    console.error('❌ EdUHK request timeout');
    req.destroy();
    onError(new Error('Request timeout'));
  });

  req.write(postData);
  req.end();
}
