import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { BedrockClient, ListFoundationModelsCommand } from '@aws-sdk/client-bedrock';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Make sure we're loading environment variables correctly
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);
console.log('.env file exists:', fs.existsSync(envPath) ? 'Yes' : 'No');

// Load environment variables from .env file
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('.env file loaded successfully');
}

// Debug log to check if environment variables are loaded
console.log('Debug - Environment variables:');
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? `Set: ${process.env.AWS_ACCESS_KEY_ID.substring(0, 5)}...` : 'Not set');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'Set (value hidden)' : 'Not set');

// Configure AWS credentials using environment variables
const config = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
};

console.log('Config accessKeyId empty?', config.credentials.accessKeyId === '');
console.log('Config secretAccessKey empty?', config.credentials.secretAccessKey === '');

/**
 * Helper function to generate prompt body based on model ID
 * @param modelId The ID of the model
 * @returns The prompt body for the model
 */
function getPromptBody(modelId: string): any {
  if (modelId.includes('amazon.nova')) {
    return {
      inferenceConfig: {
        max_new_tokens: 10,
        temperature: 0.7
      },
      messages: [
        {
          role: "user",
          content: [
            {
              text: "Hello, this is a test message."
            }
          ]
        }
      ]
    };
  } else if (modelId.includes('amazon.titan')) {
    return {
      inputText: "Hello, this is a test message.",
      textGenerationConfig: {
        maxTokenCount: 10,
        temperature: 0.7
      }
    };
  } else if (modelId.includes('meta.llama')) {
    return {
      prompt: "Hello, this is a test message.",
      temperature: 0.7,
      max_gen_len: 10
    };
  } else if (modelId.includes('anthropic')) {
    return {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 10,
      messages: [
        {
          role: "user",
          content: "Hello, this is a test message."
        }
      ]
    };
  } else {
    return {
      prompt: "Hello, this is a test message.",
      max_tokens: 10
    };
  }
}

/**
 * Tests AWS credentials by trying to list available foundation models
 */
export async function testAwsCredentials(): Promise<boolean> {
  console.log('\n[TEST] Validating AWS credentials...');
  
  if (!config.credentials.accessKeyId || !config.credentials.secretAccessKey) {
    console.error('❌ AWS credentials are not set in environment variables.');
    console.log('Make sure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set in your .env file.');
    return false;
  }
  
  try {
    const bedrockClient = new BedrockClient(config);
    const command = new ListFoundationModelsCommand({});
    
    console.log(`Connecting to AWS Bedrock in ${config.region} region...`);
    const response = await bedrockClient.send(command);
    
    console.log('✅ AWS credentials are valid. Successfully connected to Bedrock.');
    console.log(`Found ${response.modelSummaries?.length || 0} foundation models available.`);
    
    return true;
  } catch (error: any) {
    console.error('❌ Failed to authenticate with AWS:');
    console.error(`Error: ${error.message}`);
    console.error(`Error type: ${error.name}`);
    console.error(`Error code: ${error.$metadata?.httpStatusCode || 'unknown'}`);
    
    // More detailed error handling based on specific error types
    if (error.name === 'ExpiredTokenException' || error.message.includes('expired')) {
      console.log('Your AWS credentials have expired. Please generate new credentials in the AWS Console.');
    } else if (error.name === 'InvalidSignatureException' || error.message.includes('signature')) {
      console.log('Invalid signature error. This usually means your access key or secret key is incorrect.');
    } else if (error.name === 'UnrecognizedClientException') {
      console.log('The AWS access key ID you provided does not exist in AWS records.');
    } else if (error.name === 'AccessDeniedException' || error.name === 'AuthorizationError' || 
               error.message.includes('not authorized')) {
      console.log('Your AWS credentials don\'t have permission to access Bedrock services.');
      console.log('Make sure your IAM user has the correct policies attached.');
      console.log('Required permissions include: bedrock:ListFoundationModels, bedrock:InvokeModel');
    }
    
    return false;
  }
}

/**
 * Tests access to specific model by sending a minimal request
 * @param modelId The ID of the model to test
 */
export async function testModelAccess(modelId: string): Promise<boolean> {
  console.log(`\n[TEST] Testing access to model: ${modelId}`);
  
  try {
    const bedrockRuntimeClient = new BedrockRuntimeClient(config);
    const promptBody = getPromptBody(modelId);
    
    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(promptBody)
    });
    
    console.log(`Sending test request to ${modelId}...`);
    const response = await bedrockRuntimeClient.send(command);
    
    if (response && response.body) {
      const responseBody = new TextDecoder().decode(response.body);
      console.log('✅ Successfully accessed model. Response:');
      console.log(responseBody.substring(0, 100) + (responseBody.length > 100 ? '...' : ''));
      return true;
    } else {
      console.log('⚠️ Received empty response from model.');
      return false;
    }
  } catch (error: any) {
    console.error(`❌ Failed to access model ${modelId}:`);
    console.error(`Error: ${error.message}`);
    
    if (error.message.includes('not authorized') || error.message.includes('AccessDeniedException')) {
      console.log(`Your AWS account may not have access to the ${modelId} model.`);
      console.log('Make sure you have requested and been granted access to this model in the AWS console.');
    }
    
    return false;
  }
}

/**
 * Tests streaming access to a specific model by sending a streaming request
 * @param modelId The ID of the model to test
 */
export async function testStreamingAccess(modelId: string): Promise<boolean> {
  console.log(`\n[TEST] Testing streaming access to model: ${modelId}`);
  
  try {
    const bedrockRuntimeClient = new BedrockRuntimeClient(config);
    const promptBody = getPromptBody(modelId);
    
    const command = new InvokeModelWithResponseStreamCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(promptBody)
    });
    
    console.log(`Sending streaming test request to ${modelId}...`);
    const response = await bedrockRuntimeClient.send(command);
    
    if (response.body) {
      for await (const chunk of response.body) {
        console.log('Received a chunk from streaming response.');
        return true; // Return true as soon as we get a chunk
      }
    }
    console.log('No chunks received from streaming response.');
    return false;
  } catch (error: any) {
    console.error(`❌ Failed to access model ${modelId} with streaming:`, error);
    return false;
  }
}

/**
 * Run all AWS credential tests including streaming test
 */
export async function runAllTests(): Promise<void> {
  console.log('=== AWS BEDROCK CREDENTIALS VALIDATION ===');
  console.log('Testing AWS credentials and model access for chat service...');
  
  // First check if basic credentials work
  const credentialsValid = await testAwsCredentials();
  
  if (!credentialsValid) {
    console.error('\n❌ AWS credentials validation failed. Cannot proceed with model tests.');
    return;
  }
  
  // If credentials are valid, test each model
  const modelsToTest = [
    'amazon.nova-micro-v1:0',
    'amazon.nova-lite-v1:0',
    'amazon.titan-text-express-v1',
    'meta.llama3-70b-instruct-v1:0',
    "anthropic.claude-3-sonnet-20240229-v1:0"
  ];
  
  const results: Record<string, boolean> = {};
  
  for (const modelId of modelsToTest) {
    results[modelId] = await testModelAccess(modelId);
  }
  
  // Print summary for non-streaming tests
  console.log('\n=== TEST SUMMARY ===');
  console.log('AWS Credentials:', credentialsValid ? '✅ VALID' : '❌ INVALID');
  console.log('Model Access:');
  
  for (const [modelId, result] of Object.entries(results)) {
    console.log(`- ${modelId}: ${result ? '✅ ACCESSIBLE' : '❌ NOT ACCESSIBLE'}`);
  }
  
  if (Object.values(results).some(result => !result)) {
    console.log('\n⚠️ Some models are not accessible with your current AWS credentials.');
    console.log('Please check your AWS console to ensure you have requested access to these models.');
  } else {
    console.log('\n✅ All models are accessible with your current AWS credentials.');
  }
  
  // Test streaming access for a specific model (e.g., meta.llama3-70b-instruct-v1:0)
  const streamingModelId = 'anthropic.claude-3-sonnet-20240229-v1:0';
  console.log(`\nTesting streaming access for ${streamingModelId}`);
  const streamingWorks = await testStreamingAccess(streamingModelId);
  console.log(`Streaming access: ${streamingWorks ? '✅ SUCCESS' : '❌ FAILED'}`);
}

// Run all tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Unhandled error during tests:');
    console.error(error);
    process.exit(1);
  });
}