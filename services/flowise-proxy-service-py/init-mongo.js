// MongoDB initialization script for test database
// This script runs when the MongoDB container starts for the first time

// Switch to the test database
db = db.getSiblingDB('flowise_proxy_test');

// Create a test user with read/write access to the test database
db.createUser({
  user: 'testuser',
  pwd: 'testpass',
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

print('Test database initialized successfully');
