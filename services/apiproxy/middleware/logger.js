/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();
  
  // Log request
  console.log(`📥 ${req.method} ${req.url}`, {
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      'authorization': req.headers['authorization'] ? '[REDACTED]' : undefined,
      'api-key': req.headers['api-key'] ? '[REDACTED]' : undefined
    },
    body: req.method === 'POST' ? sanitizeRequestBody(req.body) : undefined
  });

  // Capture response
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    const responseSize = Buffer.byteLength(data, 'utf8');
    
    console.log(`📤 ${req.method} ${req.url} - ${res.statusCode} (${duration}ms, ${responseSize} bytes)`);
    
    // Log error responses
    if (res.statusCode >= 400) {
      console.error('Error response:', data);
    }
    
    originalSend.call(this, data);
  };

  next();
}

/**
 * Sanitize request body for logging (remove sensitive data)
 */
function sanitizeRequestBody(body) {
  if (!body) return body;
  
  const sanitized = { ...body };
  
  // Remove or redact sensitive fields
  if (sanitized.messages) {
    sanitized.messages = sanitized.messages.map(msg => ({
      ...msg,
      content: msg.content ? `[CONTENT_LENGTH:${msg.content.length}]` : msg.content
    }));
  }
  
  if (sanitized.prompt) {
    sanitized.prompt = `[PROMPT_LENGTH:${sanitized.prompt.length}]`;
  }
  
  return sanitized;
}

module.exports = {
  requestLogger
};
