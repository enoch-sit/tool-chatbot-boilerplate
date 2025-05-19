/**
 * AWS Bedrock Response Parser Test
 * 
 * This script isolates and tests the JSON parsing functionality from the chat controller
 * that's responsible for the "Error processing model response. Please try again." message.
 * 
 * It tests different model response formats and error scenarios to diagnose parsing issues.
 */
import * as fs from 'fs';
import * as path from 'path';

// Simple mocked logger to avoid dependencies
const logger = {
  debug: (message: string, ...args: any[]) => console.log(`[DEBUG] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
  info: (message: string, ...args: any[]) => console.info(`[INFO] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args)
};

// Used for storing test results
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  extractedContent?: string;
}

/**
 * Isolated response parser function from chat.controller.ts
 * This is the exact logic used in the controller but isolated for testing
 */
function parseModelResponse(rawResponseText: string, modelId: string): string {
  try {
    // This is where JSON parsing errors can occur if the response is not valid JSON
    const responseBody = JSON.parse(rawResponseText);
    
    logger.debug(`Parsed response structure: ${JSON.stringify(Object.keys(responseBody))}`);
    
    // Response parsing logic based on model type
    let responseContent = '';
    
    if (modelId.includes('anthropic')) {
      // Handle different versions of Anthropic Claude API responses
      if (responseBody.content && Array.isArray(responseBody.content)) {
        // Newer Claude API format
        responseContent = responseBody.content[0]?.text || '';
      } else if (responseBody.completion) {
        // Older Claude API format
        responseContent = responseBody.completion;
      } else {
        // Last resort fallback
        responseContent = JSON.stringify(responseBody);
      }
    } else if (modelId.includes('amazon.titan')) {
      // Handle different Titan response formats
      responseContent = responseBody.results?.[0]?.outputText || 
                         responseBody.outputText || 
                         responseBody.output || 
                         '';
    } else if (modelId.includes('amazon.nova')) {
      // Handle the newer Amazon Nova format
      if (responseBody.outputs && Array.isArray(responseBody.outputs)) {
        responseContent = responseBody.outputs[0]?.text || '';
      } else if (responseBody.results && Array.isArray(responseBody.results)) {
        responseContent = responseBody.results[0]?.outputText || '';
      } else {
        responseContent = responseBody.text || 
                           responseBody.output || 
                           '';
      }
    } else if (modelId.includes('meta.llama')) {
      // Handle Meta's Llama models
      responseContent = responseBody.generation || 
                         responseBody.text || 
                         '';
    } else {
      // Fallback for unknown/future models - try common patterns
      responseContent = responseBody.content?.[0]?.text || 
                         responseBody.completion || 
                         responseBody.text ||
                         responseBody.results?.[0]?.outputText || 
                         responseBody.generation || 
                         responseBody.output ||
                         JSON.stringify(responseBody);
    }
    
    logger.debug(`Extracted response content: ${responseContent.substring(0, 100)}...`);
    return responseContent;
    
  } catch (parseError) {
    // This produces the "Error processing model response" message
    logger.error('Error parsing AI model response:', parseError);
    return 'Error processing model response. Please try again.';
  }
}

/**
 * Test harness to run multiple test cases against the parser
 */
function runTests() {
  console.log('=== BEDROCK RESPONSE PARSER TEST ===\n');
  
  const testCases = [
    // Valid responses for different model types
    {
      name: 'Claude valid response (new format)',
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      response: JSON.stringify({
        content: [{ text: 'This is a valid Claude response.' }]
      })
    },
    {
      name: 'Claude valid response (old format)',
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      response: JSON.stringify({
        completion: 'This is a valid Claude response in the old format.'
      })
    },
    {
      name: 'Titan valid response',
      modelId: 'amazon.titan-text-express-v1',
      response: JSON.stringify({
        results: [{ outputText: 'This is a valid Titan response.' }]
      })
    },
    {
      name: 'Nova valid response',
      modelId: 'amazon.nova-lite-v1:0',
      response: JSON.stringify({
        outputs: [{ text: 'This is a valid Nova response.' }]
      })
    },
    {
      name: 'Llama valid response',
      modelId: 'meta.llama3-70b-instruct-v1:0',
      response: JSON.stringify({
        generation: 'This is a valid Llama response.'
      })
    },
    
    // Error cases that might trigger the "Error processing model response" message
    {
      name: 'Invalid JSON response',
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      response: '{ "content": [{ "text": "This is broken JSON" '  // Missing closing brackets
    },
    {
      name: 'Empty response',
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      response: ''
    },
    {
      name: 'Unexpected format - number',
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      response: '42'
    },
    {
      name: 'Unexpected format - string',
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      response: '"This is just a string, not a JSON object"'
    },
    {
      name: 'Unexpected format - array',
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      response: '["item1", "item2"]'
    },
    {
      name: 'Unexpected format - null',
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      response: 'null'
    },
    {
      name: 'Unexpected format - boolean',
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      response: 'true'
    },
    {
      name: 'Unexpected format - incomplete JSON with valid prefix',
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      response: '{"content":'
    },
    
    // Hybrid cases - valid JSON but missing expected fields
    {
      name: 'Valid JSON but missing expected fields (Claude)',
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      response: JSON.stringify({
        unexpected_field: 'This is not what the code expects for Claude.'
      })
    },
    {
      name: 'Valid JSON but wrong structure (Claude)',
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      response: JSON.stringify({
        content: 'This should be an array but is a string'
      })
    },
    {
      name: 'Valid JSON but empty object',
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      response: '{}'
    }
  ];
  
  // Array to store test results
  const results: TestResult[] = [];
  
  // Run each test case
  for (const testCase of testCases) {
    console.log(`Running test: ${testCase.name}`);
    
    try {
      const extractedContent = parseModelResponse(testCase.response, testCase.modelId);
      
      const errorMessage = 'Error processing model response. Please try again.';
      const isError = extractedContent === errorMessage;
      
      // Determine if test passed based on expected outcome
      let passed = false;
      
      if (testCase.name.includes('valid response')) {
        // Valid tests should not return error
        passed = !isError && extractedContent.length > 0;
      } else if (testCase.name.includes('Invalid') || testCase.name.includes('Unexpected')) {
        // Invalid tests should return the error message
        passed = isError;
      } else if (testCase.name.includes('missing expected fields') || 
                testCase.name.includes('wrong structure') ||
                testCase.name.includes('empty object')) {
        // These edge cases should not crash but might return empty or error
        passed = true;
      }
      
      results.push({
        name: testCase.name,
        passed,
        extractedContent
      });
      
      if (passed) {
        console.log(`  ✅ PASSED`);
      } else {
        console.log(`  ❌ FAILED`);
      }
      console.log(`  Result: "${extractedContent}"\n`);
      
    } catch (error) {
      console.error(`Unexpected error in test "${testCase.name}":`, error);
      results.push({
        name: testCase.name,
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  // Print summary
  console.log('=== TEST SUMMARY ===');
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${results.filter(r => r.passed).length}`);
  console.log(`Failed: ${results.filter(r => !r.passed).length}\n`);
  
  // Print failed tests
  const failedTests = results.filter(r => !r.passed);
  if (failedTests.length > 0) {
    console.log('Failed tests:');
    for (const test of failedTests) {
      console.log(`  - ${test.name}`);
      if (test.error) {
        console.log(`    Error: ${test.error}`);
      }
      if (test.extractedContent) {
        console.log(`    Output: "${test.extractedContent}"`);
      }
    }
  }
}

// Run the tests when this file is executed directly
runTests();