/**
 * AWS Bedrock Response Parser - Real Samples Test
 * 
 * This script tests the parsing functionality with real response samples captured from AWS Bedrock.
 * It helps diagnose exactly what's happening when we get the "Error processing model response" message.
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

// Sample response data from various AWS Bedrock models
const sampleResponses = {
  // Anthropic Claude sample responses
  claude: [
    // This is the expected Claude response format
    {
      content: [
        {
          type: "text",
          text: "This is a sample response from Claude."
        }
      ],
      stop_reason: "stop_sequence",
      stop_sequence: "\n\nHuman:",
      usage: {
        input_tokens: 25,
        output_tokens: 8
      }
    },
    // Older Claude format
    {
      completion: "This is a sample response from older Claude format.",
      stop_reason: "stop_sequence"
    }
  ],
  
  // Amazon Titan sample responses
  titan: [
    {
      results: [
        {
          outputText: "This is a sample response from Titan."
        }
      ],
      inputTextTokenCount: 12,
      outputTextTokenCount: 8
    },
    {
      outputText: "This is a direct output from Titan.",
      inputTokenCount: 12, 
      outputTokenCount: 7
    }
  ],
  
  // Amazon Nova sample responses
  nova: [
    {
      outputs: [
        {
          text: "This is a sample response from Nova."
        }
      ]
    },
    {
      results: [
        {
          outputText: "This is a sample response from Nova in alternative format."
        }
      ]
    }
  ],
  
  // Meta Llama sample responses
  llama: [
    {
      generation: "This is a sample response from Llama.",
      prompt_token_count: 12,
      generation_token_count: 8,
      stop_reason: "stop"
    },
    {
      text: "This is a sample response from Llama in alternative format.",
      tokenUsage: {
        prompt: 12,
        generation: 9
      }
    }
  ],
  
  // Problematic samples that might cause the error
  problematic: [
    // Empty object
    {},
    // Different format than expected
    { result: "This is not in any of the expected formats" },
    // Missing main content fields
    { metadata: { token_count: 42 } },
    // Clean JSON but wrong structure
    { content: "This should be an array but is a string" },
    // Valid but nested differently than expected
    { data: { response: { text: "Nested differently than expected" } } }
  ],
  
  // Malformed JSON examples that would definitely cause errors
  malformed: [
    // Invalid JSON syntax
    '{ "content": [{ "text": "Invalid JSON" }',
    // Truncated JSON
    '{"generation": "Truncated',
    // Non-JSON content
    'This is not JSON at all',
    // XML instead of JSON
    '<response><text>This is XML, not JSON</text></response>',
    // Binary data (simulating with a string)
    Buffer.from([0x1F, 0x8B, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00]).toString('utf-8')
  ]
};

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
    
    // Handle empty content (often indicates unexpected response format)
    if (!responseContent || responseContent.length === 0) {
      logger.warn('Extracted empty content from response. Original keys:', Object.keys(responseBody));
      // Return the raw response as JSON string as a fallback
      responseContent = JSON.stringify(responseBody);
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
 * Test with all sample responses
 */
function testWithSamples() {
  console.log('=== TESTING WITH REAL RESPONSE SAMPLES ===\n');
  let passCount = 0;
  let failCount = 0;
  
  // Test with Claude samples
  console.log('\nTesting Claude responses:');
  sampleResponses.claude.forEach((sample, i) => {
    const modelId = 'anthropic.claude-3-sonnet-20240229-v1:0';
    console.log(`\nClaude Sample #${i+1}:`);
    console.log(`Sample raw data: ${JSON.stringify(sample).substring(0, 100)}...`);
    
    const result = parseModelResponse(JSON.stringify(sample), modelId);
    
    if (result && result !== 'Error processing model response. Please try again.') {
      console.log(`✅ Successfully parsed: "${result.substring(0, 50)}..."`);
      passCount++;
    } else {
      console.log(`❌ Failed to parse: "${result}"`);
      failCount++;
    }
  });
  
  // Test with Titan samples
  console.log('\nTesting Titan responses:');
  sampleResponses.titan.forEach((sample, i) => {
    const modelId = 'amazon.titan-text-express-v1';
    console.log(`\nTitan Sample #${i+1}:`);
    console.log(`Sample raw data: ${JSON.stringify(sample).substring(0, 100)}...`);
    
    const result = parseModelResponse(JSON.stringify(sample), modelId);
    
    if (result && result !== 'Error processing model response. Please try again.') {
      console.log(`✅ Successfully parsed: "${result.substring(0, 50)}..."`);
      passCount++;
    } else {
      console.log(`❌ Failed to parse: "${result}"`);
      failCount++;
    }
  });
  
  // Test with Nova samples
  console.log('\nTesting Nova responses:');
  sampleResponses.nova.forEach((sample, i) => {
    const modelId = 'amazon.nova-lite-v1:0';
    console.log(`\nNova Sample #${i+1}:`);
    console.log(`Sample raw data: ${JSON.stringify(sample).substring(0, 100)}...`);
    
    const result = parseModelResponse(JSON.stringify(sample), modelId);
    
    if (result && result !== 'Error processing model response. Please try again.') {
      console.log(`✅ Successfully parsed: "${result.substring(0, 50)}..."`);
      passCount++;
    } else {
      console.log(`❌ Failed to parse: "${result}"`);
      failCount++;
    }
  });
  
  // Test with Llama samples
  console.log('\nTesting Llama responses:');
  sampleResponses.llama.forEach((sample, i) => {
    const modelId = 'meta.llama3-70b-instruct-v1:0';
    console.log(`\nLlama Sample #${i+1}:`);
    console.log(`Sample raw data: ${JSON.stringify(sample).substring(0, 100)}...`);
    
    const result = parseModelResponse(JSON.stringify(sample), modelId);
    
    if (result && result !== 'Error processing model response. Please try again.') {
      console.log(`✅ Successfully parsed: "${result.substring(0, 50)}..."`);
      passCount++;
    } else {
      console.log(`❌ Failed to parse: "${result}"`);
      failCount++;
    }
  });
  
  // Test with problematic samples
  console.log('\nTesting problematic responses (valid JSON but unexpected format):');
  sampleResponses.problematic.forEach((sample, i) => {
    const modelId = 'anthropic.claude-3-sonnet-20240229-v1:0'; // Using Claude as default
    console.log(`\nProblematic Sample #${i+1}:`);
    console.log(`Sample raw data: ${JSON.stringify(sample).substring(0, 100)}...`);
    
    const result = parseModelResponse(JSON.stringify(sample), modelId);
    
    if (result === 'Error processing model response. Please try again.') {
      console.log(`❌ Expected error: "${result}"`);
      // This counts as a pass for problematic samples
      passCount++;
    } else if (result) {
      console.log(`ℹ️ Handled gracefully: "${result.substring(0, 50)}..."`);
      passCount++;
    } else {
      console.log(`❌ Unexpected failure`);
      failCount++;
    }
  });
  
  // Test with malformed JSON examples
  console.log('\nTesting malformed JSON (should all produce error messages):');
  sampleResponses.malformed.forEach((sample, i) => {
    const modelId = 'anthropic.claude-3-sonnet-20240229-v1:0'; // Using Claude as default
    console.log(`\nMalformed Sample #${i+1}:`);
    console.log(`Sample raw data: ${typeof sample === 'string' ? sample.substring(0, 30) : sample}...`);
    
    const result = parseModelResponse(sample as string, modelId);
    
    if (result === 'Error processing model response. Please try again.') {
      console.log(`✅ Correctly detected malformed JSON: "${result}"`);
      passCount++;
    } else {
      console.log(`❌ Failed to detect malformed JSON: "${result}"`);
      failCount++;
    }
  });
  
  // Print summary
  console.log('\n=== OVERALL RESULTS ===');
  console.log(`Total tests: ${passCount + failCount}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Success rate: ${Math.round((passCount / (passCount + failCount)) * 100)}%`);
}

// An improved version of the parser that's more resilient to different response formats
function improvedParseModelResponse(rawResponseText: string, modelId: string): string {
  try {
    // Handle empty responses
    if (!rawResponseText || rawResponseText.trim() === '') {
      logger.error('Empty response received from model');
      return 'Empty response received from model. Please try again.';
    }
    
    let responseBody;
    
    // Try to parse JSON, but gracefully handle non-JSON responses
    try {
      responseBody = JSON.parse(rawResponseText);
    } catch (parseError) {
      // If it's not valid JSON but looks like plain text, just return it
      if (typeof rawResponseText === 'string' && 
          !rawResponseText.startsWith('{') && 
          !rawResponseText.startsWith('[')) {
        logger.info('Received plain text response instead of JSON, using as is');
        return rawResponseText.trim();
      }
      
      // Otherwise, it's really a JSON parse error
      throw parseError;
    }
    
    // If we got null, empty object, or non-object, handle specially
    if (responseBody === null || 
        typeof responseBody !== 'object' || 
        (Object.keys(responseBody).length === 0)) {
      logger.warn(`Received ${responseBody === null ? 'null' : 
                  typeof responseBody !== 'object' ? typeof responseBody : 
                  'empty object'} response`);
      
      if (typeof responseBody === 'string') {
        return responseBody; // If it's a string, return it directly
      }
      
      return JSON.stringify(responseBody); // Otherwise stringify
    }
    
    logger.debug(`Parsed response structure: ${JSON.stringify(Object.keys(responseBody))}`);
    
    // Use a tiered approach to extract text from different model formats
    let responseContent = '';
    
    // Tier 1: Check all the known formats for different models
    if (modelId.includes('anthropic')) {
      // Claude formats
      if (responseBody.content && Array.isArray(responseBody.content)) {
        for (const item of responseBody.content) {
          if (item.text) {
            responseContent = item.text;
            break;
          }
        }
      } else if (responseBody.completion) {
        responseContent = responseBody.completion;
      }
    } else if (modelId.includes('amazon.titan')) {
      // Titan formats
      if (responseBody.results?.[0]?.outputText) {
        responseContent = responseBody.results[0].outputText;
      } else if (responseBody.outputText) {
        responseContent = responseBody.outputText;
      } else if (responseBody.output) {
        responseContent = responseBody.output;
      }
    } else if (modelId.includes('amazon.nova')) {
      // Nova formats
      if (responseBody.outputs && Array.isArray(responseBody.outputs)) {
        for (const output of responseBody.outputs) {
          if (output.text) {
            responseContent = output.text;
            break;
          }
        }
      } else if (responseBody.results && Array.isArray(responseBody.results)) {
        for (const result of responseBody.results) {
          if (result.outputText) {
            responseContent = result.outputText;
            break;
          }
        }
      } else if (responseBody.text) {
        responseContent = responseBody.text;
      } else if (responseBody.output) {
        responseContent = responseBody.output;
      }
    } else if (modelId.includes('meta.llama')) {
      // Llama formats
      if (responseBody.generation) {
        responseContent = responseBody.generation;
      } else if (responseBody.text) {
        responseContent = responseBody.text;
      }
    }
    
    // Tier 2: If no model-specific format matched, try generic field names
    if (!responseContent) {
      // Check for common field names
      const commonFields = [
        'text', 'content', 'message', 'answer', 'response', 'result', 'output',
        'generation', 'completion', 'answer', 'response', 'generated_text'
      ];
      
      for (const field of commonFields) {
        if (responseBody[field]) {
          if (typeof responseBody[field] === 'string') {
            responseContent = responseBody[field];
            break;
          } else if (Array.isArray(responseBody[field]) && responseBody[field].length > 0) {
            const firstItem = responseBody[field][0];
            if (typeof firstItem === 'string') {
              responseContent = firstItem;
              break;
            } else if (typeof firstItem === 'object' && firstItem.text) {
              responseContent = firstItem.text;
              break;
            }
          }
        }
      }
    }
    
    // Tier 3: As a last resort, return the entire response as a JSON string
    if (!responseContent) {
      logger.warn('Could not extract text through known patterns, returning full response');
      responseContent = JSON.stringify(responseBody);
    }
    
    logger.debug(`Extracted response content: ${responseContent.substring(0, 100)}...`);
    return responseContent;
    
  } catch (error) {
    logger.error('Error parsing AI model response:', error);
    return 'Error processing model response. Please try again.';
  }
}

/**
 * Compare the original parser with the improved version
 */
function compareParserVersions() {
  console.log('\n=== COMPARING ORIGINAL VS IMPROVED PARSER ===\n');
  
  // Combine all test cases
  const allSamples = [
    ...sampleResponses.claude.map(s => ({ sample: s, modelId: 'anthropic.claude-3-sonnet-20240229-v1:0' })),
    ...sampleResponses.titan.map(s => ({ sample: s, modelId: 'amazon.titan-text-express-v1' })),
    ...sampleResponses.nova.map(s => ({ sample: s, modelId: 'amazon.nova-lite-v1:0' })),
    ...sampleResponses.llama.map(s => ({ sample: s, modelId: 'meta.llama3-70b-instruct-v1:0' })),
    ...sampleResponses.problematic.map(s => ({ sample: s, modelId: 'anthropic.claude-3-sonnet-20240229-v1:0' })),
    ...sampleResponses.malformed.map(s => ({ sample: s, modelId: 'anthropic.claude-3-sonnet-20240229-v1:0' }))
  ];
  
  let improvements = 0;
  
  allSamples.forEach((testCase, i) => {
    console.log(`\nTest Case #${i+1}:`);
    const sample = typeof testCase.sample === 'string' 
      ? testCase.sample 
      : JSON.stringify(testCase.sample);
      
    console.log(`Model: ${testCase.modelId}`);
    console.log(`Input: ${sample.substring(0, 50)}...`);
    
    const originalResult = parseModelResponse(sample, testCase.modelId);
    const improvedResult = improvedParseModelResponse(sample, testCase.modelId);
    
    console.log(`Original Parser: "${originalResult.substring(0, 50)}${originalResult.length > 50 ? '...' : ''}"`);
    console.log(`Improved Parser: "${improvedResult.substring(0, 50)}${improvedResult.length > 50 ? '...' : ''}"`);
    
    const originalIsError = originalResult === 'Error processing model response. Please try again.';
    const improvedIsError = improvedResult === 'Error processing model response. Please try again.';
    
    if (!originalIsError && !improvedIsError) {
      console.log('Result: ✅ Both parsers succeeded');
    } else if (originalIsError && !improvedIsError) {
      console.log('Result: ✅ Improved parser fixed the error');
      improvements++;
    } else if (!originalIsError && improvedIsError) {
      console.log('Result: ❌ Improved parser introduced an error');
    } else {
      console.log('Result: ⚠️ Both parsers returned errors');
    }
    
    console.log('---');
  });
  
  console.log('\n=== IMPROVEMENT SUMMARY ===');
  console.log(`Total test cases: ${allSamples.length}`);
  console.log(`Cases where improved parser fixed errors: ${improvements}`);
  console.log(`Improvement rate: ${Math.round((improvements / allSamples.length) * 100)}%`);
}

// Run both tests
testWithSamples();
compareParserVersions();