// MongoDB initialization script for production database
// This script runs when the MongoDB container starts for the first time

// Switch to the production database
db = db.getSiblingDB('flowise_proxy');

// Create a production user with read/write access to the database
db.createUser({
  user: 'admin',
  pwd: 's3cr3t_p@ssw0rdds_!@#$',
  roles: [
    {
      role: 'readWrite',
      db: 'flowise_proxy'
    }
  ]
});

// Create initial collections if needed
db.createCollection('users');
db.createCollection('chatflows');
db.createCollection('user_chatflows');
db.createCollection('refresh_tokens');
db.createCollection('chat_sessions');
db.createCollection('chat_messages');

print('Production database initialized successfully');
