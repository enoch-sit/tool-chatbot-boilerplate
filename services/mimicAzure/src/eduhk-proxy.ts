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
      // Handle content array (text + images)
      // This preserves image_url content types for vision requests
      console.log(`📸 Processing content array with ${msg.content.length} items`);
      const hasImage = msg.content.some((item: any) => item.type === 'image_url');
      if (hasImage) {
        console.log('🖼️  Image content detected - forwarding to EdUHK vision model');
      }
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

// Transform EdUHK non-streaming response to Azure format
export function reformatNonStreamResponse(eduhkResponse: any): any {
  try {
    console.log('🔄 Transforming EdUHK response to Azure format');
    console.log('📥 EdUHK response:', JSON.stringify(eduhkResponse, null, 2));

    // Generate Azure-compatible values if missing
    const chatId = eduhkResponse.id || `chatcmpl-${Math.random().toString(36).substring(2, 32)}`;
    const created = eduhkResponse.created || Math.floor(Date.now() / 1000);
    const systemFingerprint = eduhkResponse.system_fingerprint || `fp_${Math.random().toString(36).substring(2, 12)}`;

    const azureResponse = {
      id: chatId,
      object: 'chat.completion',
      created: created,
      model: eduhkResponse.model || 'gpt-4.1-2025-04-14',
      choices: eduhkResponse.choices?.map((choice: any) => ({
        index: choice.index || 0,
        message: {
          role: choice.message?.role || 'assistant',
          content: choice.message?.content || '',
          refusal: choice.message?.refusal || null,
          annotations: choice.message?.annotations || [],
          audio: choice.message?.audio || null,
          function_call: choice.message?.function_call || null,
          tool_calls: choice.message?.tool_calls || null
        },
        logprobs: choice.logprobs || null,
        finish_reason: choice.finish_reason || 'stop',
        content_filter_results: choice.content_filter_results || {
          hate: { filtered: false, severity: 'safe' },
          self_harm: { filtered: false, severity: 'safe' },
          sexual: { filtered: false, severity: 'safe' },
          violence: { filtered: false, severity: 'safe' }
        }
      })) || [],
      usage: eduhkResponse.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        completion_tokens_details: null,
        prompt_tokens_details: null
      },
      system_fingerprint: systemFingerprint,
      service_tier: eduhkResponse.service_tier || null,
      _request_id: eduhkResponse._request_id || null,
      prompt_filter_results: eduhkResponse.prompt_filter_results || [{
        prompt_index: 0,
        content_filter_results: {
          hate: { filtered: false, severity: 'safe' },
          self_harm: { filtered: false, severity: 'safe' },
          sexual: { filtered: false, severity: 'safe' },
          violence: { filtered: false, severity: 'safe' }
        }
      }]
    };

    console.log('📤 Transformed Azure response:', JSON.stringify(azureResponse, null, 2));
    return azureResponse;
  } catch (error) {
    console.error('❌ Error transforming EdUHK response:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Response transformation failed: ${errorMessage}`);
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
