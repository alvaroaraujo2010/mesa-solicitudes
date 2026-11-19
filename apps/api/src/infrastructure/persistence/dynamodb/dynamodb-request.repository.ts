import { Inject, Injectable } from '@nestjs/common';
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { RequestEntity } from '../../../domain/entities/request.entity';
import { RequestStatus } from '../../../domain/enums/request-status.enum';
import {
  FindAllParams,
  FindAllResult,
  IRequestRepository,
} from '../../../domain/repositories/request.repository.interface';
import { DYNAMODB_CLIENT_TOKEN } from './dynamodb.provider';
import { loadConfig } from '../../config/env.config';

interface DynamoItem {
  pk: string;
  sk: string;
  id: string;
  tenantId: string;
  title: string;
  description: string;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

function itemToEntity(item: DynamoItem): RequestEntity {
  return RequestEntity.fromPersistence({
    id: item.id,
    tenantId: item.tenantId,
    title: item.title,
    description: item.description,
    status: item.status as RequestStatus,
    createdBy: item.createdBy,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  });
}

function entityToItem(entity: RequestEntity): DynamoItem {
  return {
    pk: entity.tenantId,
    sk: entity.id,
    id: entity.id,
    tenantId: entity.tenantId,
    title: entity.title,
    description: entity.description,
    status: entity.status,
    createdBy: entity.createdBy,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

@Injectable()
export class DynamodbRequestRepository implements IRequestRepository {
  private readonly tableName: string;

  constructor(
    @Inject(DYNAMODB_CLIENT_TOKEN)
    private readonly docClient: DynamoDBDocumentClient,
  ) {
    this.tableName = loadConfig().dynamodb.tableName;
  }

  async save(entity: RequestEntity): Promise<void> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: entityToItem(entity),
      }),
    );
  }

  async findById(id: string, tenantId: string): Promise<RequestEntity | null> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk: tenantId, sk: id },
      }),
    );
    if (!result.Item) return null;
    return itemToEntity(result.Item as DynamoItem);
  }

  async findAll(params: FindAllParams): Promise<FindAllResult> {
    // Query using partition key (tenant isolation). Filter expressions handle status and search.
    const expressionAttributeNames: Record<string, string> = { '#pk': 'pk' };
    const expressionAttributeValues: Record<string, unknown> = { ':pk': params.tenantId };

    let filterExpression: string | undefined;
    const filters: string[] = [];

    if (params.status) {
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = params.status;
      filters.push('#status = :status');
    }

    if (params.q) {
      expressionAttributeNames['#title'] = 'title';
      expressionAttributeValues[':q'] = params.q.toLowerCase();
      // DynamoDB doesn't support LIKE; use contains()
      filters.push('(contains(#title, :q) OR contains(sk, :q))');
    }

    if (filters.length > 0) {
      filterExpression = filters.join(' AND ');
    }

    // Scan all matching items (DynamoDB doesn't support SQL COUNT + OFFSET natively).
    // For a production system with 50k+ items, a GSI + pagination token would be used.
    // Here we implement full scan per tenant partition for correctness.
    const allItems: DynamoItem[] = [];
    let lastKey: Record<string, unknown> | undefined;

    do {
      const result = await this.docClient.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: '#pk = :pk',
          FilterExpression: filterExpression,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ExclusiveStartKey: lastKey,
        }),
      );
      if (result.Items) {
        allItems.push(...(result.Items as DynamoItem[]));
      }
      lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);

    // Sort by createdAt descending
    allItems.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const total = allItems.length;
    const start = (params.page - 1) * params.pageSize;
    const paged = allItems.slice(start, start + params.pageSize);

    return {
      items: paged.map(itemToEntity),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async update(entity: RequestEntity): Promise<void> {
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { pk: entity.tenantId, sk: entity.id },
        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': entity.status,
          ':updatedAt': entity.updatedAt.toISOString(),
        },
      }),
    );
  }

  async bulkInsert(entities: RequestEntity[]): Promise<void> {
    if (entities.length === 0) return;

    const BATCH_SIZE = 25;
    const CONCURRENCY = 10;
    const batches: RequestEntity[][] = [];

    for (let i = 0; i < entities.length; i += BATCH_SIZE) {
      batches.push(entities.slice(i, i + BATCH_SIZE));
    }

    for (let i = 0; i < batches.length; i += CONCURRENCY) {
      const concurrent = batches.slice(i, i + CONCURRENCY);
      await Promise.all(concurrent.map((batch) => this.writeBatch(batch)));
    }
  }

  private async writeBatch(entities: RequestEntity[]): Promise<void> {
    const putRequests = entities.map((e) => ({
      PutRequest: { Item: entityToItem(e) },
    }));

    await this.docClient.send(
      new BatchWriteCommand({
        RequestItems: { [this.tableName]: putRequests },
      }),
    );
  }
}
