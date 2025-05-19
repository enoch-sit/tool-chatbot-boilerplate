import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import config from '../config/config';

export const bedrockClient = new BedrockRuntimeClient({
  region: config.awsRegion,
  credentials: {
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey,
  },
});
