import express = require('express');

// Request logging middleware
export const requestLoggingMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log('\n' + '='.repeat(80));
  console.log(`🔍 [${timestamp}] Incoming Request`);
  console.log('='.repeat(80));
  console.log(`📍 Method: ${req.method}`);
  console.log(`📍 URL: ${req.url}`);
  console.log(`📍 Path: ${req.path}`);
  console.log(`📍 Protocol: ${req.protocol}`);
  console.log(`📍 Host: ${req.get('host')}`);
  console.log(`📍 User-Agent: ${req.get('user-agent') || 'Not provided'}`);
  
  console.log('\n📋 Headers:');
  Object.keys(req.headers).forEach(key => {
    console.log(`   ${key}: ${req.headers[key]}`);
  });
  
  console.log('\n🔗 Query Parameters:');
  if (Object.keys(req.query).length > 0) {
    Object.keys(req.query).forEach(key => {
      console.log(`   ${key}: ${req.query[key]}`);
    });
  } else {
    console.log('   (none)');
  }
  
  console.log('\n📦 Body:');
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(JSON.stringify(req.body, null, 2));
  } else {
    console.log('   (empty or not parsed yet)');
  }
  
  console.log('='.repeat(80));
  next();
};

// Basic logging middleware (for HTTP-only server)
export const basicLoggingMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`🔍 [${timestamp}] ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`📦 Body:`, JSON.stringify(req.body, null, 2));
  }
  next();
};
