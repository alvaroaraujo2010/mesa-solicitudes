import { DynamicModule, Module, Provider } from '@nestjs/common';
import { loadConfig } from '../config/env.config';
import { REQUEST_REPOSITORY_TOKEN } from '../../application/ports/request-repository.port';
import { MemoryRequestRepository } from './memory/memory-request.repository';
import { MysqlRequestRepository } from './mysql/mysql-request.repository';
import { MysqlPoolProvider } from './mysql/mysql.provider';
import { DynamodbRequestRepository } from './dynamodb/dynamodb-request.repository';
import { DynamodbClientProvider } from './dynamodb/dynamodb.provider';

@Module({})
export class PersistenceModule {
  static forRoot(): DynamicModule {
    const { persistenceAdapter } = loadConfig();

    let providers: Provider[];

    switch (persistenceAdapter) {
      case 'mysql':
        providers = [
          MysqlPoolProvider,
          MysqlRequestRepository,
          {
            provide: REQUEST_REPOSITORY_TOKEN,
            useExisting: MysqlRequestRepository,
          },
        ];
        break;

      case 'dynamodb':
        providers = [
          DynamodbClientProvider,
          DynamodbRequestRepository,
          {
            provide: REQUEST_REPOSITORY_TOKEN,
            useExisting: DynamodbRequestRepository,
          },
        ];
        break;

      case 'memory':
      default:
        providers = [
          MemoryRequestRepository,
          {
            provide: REQUEST_REPOSITORY_TOKEN,
            useExisting: MemoryRequestRepository,
          },
        ];
        break;
    }

    return {
      module: PersistenceModule,
      providers,
      exports: [REQUEST_REPOSITORY_TOKEN],
    };
  }
}
