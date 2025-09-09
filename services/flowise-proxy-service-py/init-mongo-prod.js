// MongoDB initialization script for test database
// This script runs when the MongoDB container starts for the first time

// Switch to the test database
db = db.getSiblingDB('flowise_proxy_test');

// Create a test user with read/write access to the test database
db.createUser({
  user: 'admin',
  pwd: 'password',
  roles: [
    {
      role: 'readWrite',
      db: 'flowise_proxy_test'
    }
  ]
});

// Create initial collections if needed
db.createCollection('users');
db.createCollection('chatflows');
db.createCollection('user_chatflows');
db.createCollection('refresh_tokens');
db.createCollection('chat_sessions'); // Add the new collection
db.createCollection('chat_messages');

print('Test database initialized successfully');
