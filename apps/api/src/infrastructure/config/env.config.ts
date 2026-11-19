export type PersistenceAdapter = 'memory' | 'mysql' | 'dynamodb';

export interface AppConfig {
  port: number;
  nodeEnv: string;
  persistenceAdapter: PersistenceAdapter;
  mysql: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    poolSize: number;
  };
  dynamodb: {
    tableName: string;
    region: string;
    endpoint?: string;
  };
}

export function loadConfig(): AppConfig {
  return {
    port: parseInt(process.env['PORT'] ?? '3000', 10),
    nodeEnv: process.env['NODE_ENV'] ?? 'development',
    persistenceAdapter: (process.env['PERSISTENCE_ADAPTER'] ?? 'memory') as PersistenceAdapter,
    mysql: {
      host: process.env['MYSQL_HOST'] ?? 'localhost',
      port: parseInt(process.env['MYSQL_PORT'] ?? '3306', 10),
      user: process.env['MYSQL_USER'] ?? 'root',
      password: process.env['MYSQL_PASSWORD'] ?? '',
      database: process.env['MYSQL_DATABASE'] ?? 'mesa_solicitudes',
      poolSize: parseInt(process.env['MYSQL_POOL_SIZE'] ?? '10', 10),
    },
    dynamodb: {
      tableName: process.env['DYNAMODB_TABLE_NAME'] ?? 'mesa-solicitudes',
      region: process.env['DYNAMODB_REGION'] ?? 'us-east-1',
      endpoint: process.env['DYNAMODB_ENDPOINT'],
    },
  };
}
