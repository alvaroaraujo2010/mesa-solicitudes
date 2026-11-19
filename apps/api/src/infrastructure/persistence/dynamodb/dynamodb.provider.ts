import { Provider } from '@nestjs/common';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { loadConfig } from '../../config/env.config';

export const DYNAMODB_CLIENT_TOKEN = Symbol('DYNAMODB_CLIENT');

export const DynamodbClientProvider: Provider = {
  provide: DYNAMODB_CLIENT_TOKEN,
  useFactory: (): DynamoDBDocumentClient => {
    const config = loadConfig();

    const clientConfig: ConstructorParameters<typeof DynamoDBClient>[0] = {
      region: config.dynamodb.region,
    };

    if (config.dynamodb.endpoint) {
      clientConfig.endpoint = config.dynamodb.endpoint;
      clientConfig.credentials = {
        accessKeyId: process.env['AWS_ACCESS_KEY_ID'] ?? 'local',
        secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'] ?? 'local',
      };
    }

    const client = new DynamoDBClient(clientConfig);
    return DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });
  },
};
