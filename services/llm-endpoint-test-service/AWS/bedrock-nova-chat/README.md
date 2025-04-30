# AWS config:

{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowBedrockStreaming",
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModelWithResponseStream"
            ],
            "Resource": "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-micro-v1:0"
        }
    ]
}