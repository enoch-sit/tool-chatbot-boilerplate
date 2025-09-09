/**
 * Check for missing dependencies and syntax errors
 */
console.log('🔍 Checking Dependencies and Syntax...');
console.log('=====================================');

// Check Node.js version
console.log('Node.js version:', process.version);

// Check required modules
const modules = [
  'express',
  'cors', 
  'morgan',
  'dotenv',
  'axios'
];

console.log('\n📦 Checking dependencies...');
for (const mod of modules) {
  try {
    require(mod);
    console.log(`✅ ${mod}`);
  } catch (error) {
    console.log(`❌ ${mod}:`, error.message);
  }
}

// Check custom files
const customFiles = [
  './routes/azureProxy',
  './transformers/customAPITransformer', 
  './services/customAPIService',
  './middleware/errorHandler',
  './middleware/logger'
];

console.log('\n📁 Checking custom files...');
for (const file of customFiles) {
  try {
    require(file);
    console.log(`✅ ${file}`);
  } catch (error) {
    console.log(`❌ ${file}:`, error.message);
  }
}

console.log('\n✅ Dependency check complete');
