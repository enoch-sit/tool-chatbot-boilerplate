/**
 * Test deployment examples for your Azure OpenAI proxy
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:7000';

// Example test with different deployment names
async function testDeployments() {
  const deployments = ['gpt-4', 'gpt-4.1', 'gpt-35-turbo'];
  
  for (const deployment of deployments) {
    console.log(`\n🧪 Testing deployment: ${deployment}`);
    
    try {
      const response = await axios.post(
        `${BASE_URL}/proxyapi/azurecom/openai/deployments/${deployment}/chat/completions`,
        {
          messages: [
            {
              role: "user",
              content: "Hello! What deployment am I using?"
            }
          ],
          max_tokens: 100,
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': 'your-api-key', // This will be forwarded to your custom API
            'api-version': '2024-12-01-preview'
          }
        }
      );
      
      console.log(`✅ ${deployment} - Success:`, response.data);
      
    } catch (error) {
      console.log(`❌ ${deployment} - Error:`, error.response?.data || error.message);
    }
  }
}

// Run the test
if (require.main === module) {
  testDeployments().catch(console.error);
}

module.exports = { testDeployments };
