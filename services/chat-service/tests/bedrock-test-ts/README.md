# AWS Bedrock Credentials and Model Access Test

This tool tests your AWS credentials for Amazon Bedrock access and validates that your account can access the required models (Nova Micro, Nova Lite, Titan, etc.).

## Prerequisites

- Docker installed on your machine
- AWS account with access to Bedrock
- AWS credentials with permissions for `bedrock:ListFoundationModels` and `bedrock:InvokeModel`

## Quick Start

1. Copy `.env.example` to `.env` and update with your AWS credentials:

```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
```

2. Run the test:
   - Double-click `run_test.bat`

3. Check the results to verify if your AWS credentials are valid and if you have access to the required models.

## What This Test Checks

- Validates that your AWS credentials are valid and can access Bedrock
- Tests access to specific models:
  - `amazon.nova-micro-v1:0`
  - `amazon.nova-lite-v1:0`
  - `amazon.titan-text-express-v1`
  - `meta.llama3-70b-instruct-v1:0`
- Provides a summary of which models your account can access

## Expected Output

If your credentials are correctly configured, you should see output similar to:

```
=== AWS BEDROCK CREDENTIALS VALIDATION ===
Testing AWS credentials and model access for chat service...

[TEST] Validating AWS credentials...
Connecting to AWS Bedrock in us-east-1 region...
✅ AWS credentials are valid. Successfully connected to Bedrock.
Found 4 foundation models available.

=== TEST SUMMARY ===
AWS Credentials: ✅ VALID
Model Access:
- amazon.nova-micro-v1:0: ✅ ACCESSIBLE
- amazon.nova-lite-v1:0: ✅ ACCESSIBLE
- amazon.titan-text-express-v1: ✅ ACCESSIBLE
- meta.llama3-70b-instruct-v1:0: ✅ ACCESSIBLE

✅ All tests passed! Your AWS credentials are properly configured.
```

## Troubleshooting

- **Access Denied Error**: Ensure your IAM user has the correct permissions and model access in the AWS Management Console.
- **Docker Build Fails**: Check Docker installation or internet connectivity.
- **Credentials Not Found**: Verify you've created the `.env` file correctly with no spaces around the equals sign.
- **Model Access Issues**: Confirm you've requested access to the models in the AWS Bedrock console.

## Setting Up AWS Permissions

1. Go to the AWS IAM Console
2. Create a new policy with the following JSON:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowBedrockAccess",
            "Effect": "Allow",
            "Action": [
                "bedrock:ListFoundationModels",
                "bedrock:InvokeModel"
            ],
            "Resource": "*"
        }
    ]
}
```

3. Attach this policy to your IAM user