# AWS Bedrock Nova Chat Testing Documentation

## Overview
This documentation provides instructions for setting up, configuring, and testing the AWS Bedrock Nova Chat service. The service allows interaction with Amazon's Nova Micro language model through both standard and streaming API endpoints.

## Prerequisites
- AWS Account with Bedrock access
- AWS CLI configured with appropriate credentials
- Node.js and npm installed
- AWS SDK for JavaScript v3

## AWS Configuration
Ensure your AWS user or role has the following permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowBedrockAccess",
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:InvokeModelWithResponseStream"
            ],
            "Resource": "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-micro-v1:0"
        }
    ]
}
```

## Installation
1. Navigate to the project directory:
   ```
   cd services/llm-endpoint-test-service/AWS/bedrock-nova-chat
   ```

2. Install dependencies:
   ```
   npm install
   ```

## Running Tests Manually
1. Compile TypeScript:
   ```
   npx tsc
   ```

2. Run the chat client:
   ```
   node dist/bedrock_nova_chat.js
   ```

3. Use the following commands in the interactive console:
   - Type messages to send them to the model
   - Type 'stream' to switch to streaming mode
   - Type 'standard' to switch to standard mode
   - Type 'quit' to exit

## Automated Testing
The automated test script (`test-bedrock.bat`) will:
1. Install dependencies
2. Compile TypeScript
3. Run a series of predefined test interactions
4. Log results to the test_logs directory

To run automated tests:
```
cd services/llm-endpoint-test-service/AWS/bedrock-nova-chat
test-bedrock.bat
```

## Troubleshooting
### Common Issues
1. **AccessDeniedException**
   - Ensure you have access to the Nova Micro model in AWS Bedrock console
   - Verify your AWS credentials and permissions

2. **Malformed Input Request**
   - Check the format of your requests against the AWS Bedrock API documentation
   - Ensure you're using the correct schema version

3. **Region Availability**
   - Verify that the Nova Micro model is available in your specified AWS region

## Performance Metrics
When testing the model, consider measuring:
- Response time (latency)
- Token generation speed
- Quality of responses for your specific use case

## Additional Resources
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Nova Micro Model Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-nova.html)