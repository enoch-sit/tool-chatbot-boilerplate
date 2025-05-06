// Simple script to check if environment variables are loading properly
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Print current directory
console.log('Current directory:', process.cwd());

// Check if .env file exists
const envPath = path.resolve(__dirname, '../.env');
console.log('.env path:', envPath);
console.log('.env file exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  // Print first few lines of .env file (without sensitive info)
  const envContent = fs.readFileSync(envPath, 'utf8');
  const safeContent = envContent
    .split('\n')
    .map(line => {
      if (line.includes('KEY') || line.includes('SECRET')) {
        return line.split('=')[0] + '=[HIDDEN]';
      }
      return line;
    })
    .slice(0, 10)
    .join('\n');
  
  console.log('\nFirst few lines of .env file (sensitive values hidden):');
  console.log(safeContent);
}

// Try loading with dotenv
console.log('\nLoading with dotenv...');
dotenv.config({ path: envPath });

// Check if AWS credential environment variables are set
console.log('\nEnvironment variables:');
console.log('AWS_REGION:', process.env.AWS_REGION || 'Not set');
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'Set (value hidden)' : 'Not set');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'Set (value hidden)' : 'Not set');

// Try direct file access to AWS credentials for comparison
try {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Extract AWS credentials using regex
    const keyIdMatch = envContent.match(/AWS_ACCESS_KEY_ID=(.+)/);
    const secretMatch = envContent.match(/AWS_SECRET_ACCESS_KEY=(.+)/);
    
    console.log('\nDirect file parse results:');
    console.log('AWS_ACCESS_KEY_ID from file:', keyIdMatch ? 'Found' : 'Not found');
    console.log('AWS_SECRET_ACCESS_KEY from file:', secretMatch ? 'Found' : 'Not found');
  }
} catch (error) {
  console.error('Error reading .env file directly:', error.message);
}

// Try using these values to create an AWS config object
const config = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
};

console.log('\nCreated config object:');
console.log('region:', config.region);
console.log('accessKeyId empty?', !config.credentials.accessKeyId);
console.log('secretAccessKey empty?', !config.credentials.secretAccessKey);