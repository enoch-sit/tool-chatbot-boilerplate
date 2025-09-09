/**
 * Error handling middleware
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body
  });

  // Default error response
  let status = err.status || err.statusCode || 500;
  let errorResponse = {
    error: {
      code: err.code || 'InternalServerError',
      message: err.message || 'An unexpected error occurred'
    }
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
    errorResponse.error.code = 'BadRequest';
  } else if (err.name === 'UnauthorizedError') {
    status = 401;
    errorResponse.error.code = 'Unauthorized';
  } else if (err.code === 'ECONNREFUSED') {
    status = 503;
    errorResponse.error.code = 'ServiceUnavailable';
    errorResponse.error.message = 'Custom API service is unavailable';
  } else if (err.code === 'ETIMEDOUT') {
    status = 504;
    errorResponse.error.code = 'GatewayTimeout';
    errorResponse.error.message = 'Custom API request timed out';
  }

  // Format error response based on the endpoint being called
  if (req.url.includes('/azure/openai/')) {
    // Azure OpenAI error format
    res.status(status).json(errorResponse);
  } else if (req.url.includes('/bedrock/')) {
    // Bedrock error format
    res.status(status).json({
      __type: errorResponse.error.code,
      message: errorResponse.error.message
    });
  } else {
    // Generic error format
    res.status(status).json(errorResponse);
  }
}

module.exports = {
  errorHandler
};
