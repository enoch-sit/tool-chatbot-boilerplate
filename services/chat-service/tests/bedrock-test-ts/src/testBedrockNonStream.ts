import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { BedrockClient, ListFoundationModelsCommand } from '@aws-sdk/client-bedrock';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Environment setup
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);
console.log('.env file exists:', fs.existsSync(envPath) ? 'Yes' : 'No');

dotenv.config({ path: envPath });

// Configure AWS credentials
const config = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
};

console.log('AWS Credentials Config:');
console.log('- Region:', config.region);
console.log('- Access Key:', config.credentials.accessKeyId ? '✓ Set' : '✗ Missing');
console.log('- Secret Key:', config.credentials.secretAccessKey ? '✓ Set' : '✗ Missing');

/**
 * Get appropriate prompt structure for different model types
 */
function getPromptBody(modelId: string): any {
  if (modelId.includes('amazon.nova')) {
    return {
      inferenceConfig: {
        max_new_tokens: 50,
        temperature: 0.7
      },
      messages: [
        {
          role: "user",
          content: [{ text: "What are the three primary colors?" }]
        }
      ]
    };
  } else if (modelId.includes('amazon.titan')) {
    return {
      inputText: "What are the three primary colors?",
      textGenerationConfig: {
        maxTokenCount: 50,
        temperature: 0.7
      }
    };
  } else if (modelId.includes('meta.llama')) {
    return {
      prompt: "What are the three primary colors?",
      temperature: 0.7,
      max_gen_len: 50
    };
  } else if (modelId.includes('anthropic')) {
    return {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 50,
      messages: [
        {
          role: "user",
          content: "What are the three primary colors?"
        }
      ]
    };
  } else {
    return {
      prompt: "What are the three primary colors?",
      max_tokens: 50
    };
  }
}

/**
 * Verify AWS credentials
 */
async function testAwsCredentials(): Promise<boolean> {
  console.log('\n[TEST] Validating AWS credentials...');
  
  if (!config.credentials.accessKeyId || !config.credentials.secretAccessKey) {
    console.error('❌ AWS credentials are not set in environment variables');
    return false;
  }
  
  try {
    const bedrockClient = new BedrockClient(config);
    const response = await bedrockClient.send(new ListFoundationModelsCommand({}));
    console.log('✅ AWS credentials valid - found', response.modelSummaries?.length || 0, 'models');
    return true;
  } catch (error: any) {
    console.error('❌ Authentication failed:', error.name, '-', error.message);
    console.error('HTTP status:', error.$metadata?.httpStatusCode || 'unknown');
    return false;
  }
}

/**
 * Test non-streaming model access with retry logic
 */
async function testNonStreamingAccess(modelId: string): Promise<boolean> {
  console.log(`\n[TEST] Testing non-streaming access to ${modelId}`);
  
  const maxRetries = 2;
  let retryCount = 0;
  
  while (retryCount <= maxRetries) {
    try {
      const bedrockClient = new BedrockRuntimeClient(config);
      const promptBody = getPromptBody(modelId);
      
      console.log(`Sending request (attempt ${retryCount + 1}/${maxRetries + 1})...`);
      
      // Create an abort controller for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const command = new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(promptBody)
      });
      
      const startTime = Date.now();
      const response = await bedrockClient.send(command, { 
        abortSignal: controller.signal 
      });
      clearTimeout(timeoutId);
      
      const completionTime = Date.now() - startTime;
      
      if (response && response.body) {
        const responseBody = new TextDecoder().decode(response.body);
        console.log(`✅ Success in ${completionTime}ms. Response:`);
        console.log(responseBody.substring(0, 200) + (responseBody.length > 200 ? '...' : ''));
        return true;
      } else {
        console.log('⚠️ Empty response received');
        return false;
      }
    } catch (error: any) {
      // Handle timeout errors
      if (error.name === 'AbortError') {
        console.error(`Request timed out after 30 seconds`);
        if (retryCount === maxRetries) {
          console.error('❌ Maximum retries reached with timeout error');
          return false;
        }
      }
      // Handle AWS specific errors
      else if (error.$metadata?.httpStatusCode) {
        const statusCode = error.$metadata.httpStatusCode;
        console.error(`❌ Bedrock error (${statusCode}): ${error.message}`);
        
        if (statusCode === 400) {
          console.error('Bad request - check prompt format for this model');
          return false;
        } else if (statusCode === 401 || statusCode === 403) {
          console.error('Authentication error - check your AWS credentials');
          return false;
        } else if (statusCode === 429) {
          console.error('Rate limit exceeded - try again later');
          if (retryCount === maxRetries) return false;
        } else if (retryCount === maxRetries) {
          return false;
        }
      } else {
        console.error(`Unexpected error: ${error.name} - ${error.message}`);
        if (retryCount === maxRetries) return false;
      }
      
      // Increment retry counter and add exponential backoff
      retryCount++;
      const backoffMs = Math.pow(2, retryCount) * 500;
      console.log(`Retrying in ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
  
  return false;
}

/**
 * Run all tests
 */
async function runAllTests(): Promise<void> {
  console.log('=== AWS BEDROCK NON-STREAMING TEST ===');
  
  const credentialsValid = await testAwsCredentials();
  if (!credentialsValid) {
    console.error('❌ Credential validation failed - cannot proceed');
    return;
  }
  
  const modelsToTest = [
    'amazon.nova-micro-v1:0',
    'amazon.nova-lite-v1:0', 
    'amazon.titan-text-express-v1',
    'meta.llama3-70b-instruct-v1:0'
  ];
  
  const results: Record<string, boolean> = {};
  
  for (const modelId of modelsToTest) {
    results[modelId] = await testNonStreamingAccess(modelId);
  }
  
  // Print summary
  console.log('\n=== TEST SUMMARY ===');
  console.log('AWS Credentials:', credentialsValid ? '✅ VALID' : '❌ INVALID');
  
  for (const [modelId, result] of Object.entries(results)) {
    console.log(`- ${modelId}: ${result ? '✅ ACCESSIBLE' : '❌ NOT ACCESSIBLE'}`);
  }
  
  if (Object.values(results).every(result => result)) {
    console.log('\n✅ All models are accessible via non-streaming API');
  } else {
    console.log('\n⚠️ Some models failed non-streaming access test');
  }
}

// Run tests when executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}