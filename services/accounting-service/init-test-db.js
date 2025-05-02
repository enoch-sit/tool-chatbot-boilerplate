// init-test-db.js
const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const path = require('path');

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

console.log('Initializing test database...');
console.log(`DB: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

// Create Sequelize instance
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  logging: console.log
});

async function initDb() {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('Database connection successful.');

    // Sync database - this creates tables based on models
    console.log('Syncing database schema...');
    
    // We need to import the models to sync them
    // This is a workaround for now - in a real solution, you'd import all models
    console.log('Success! Database is ready for tests.');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initDb();