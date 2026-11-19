import { Provider } from '@nestjs/common';
import * as mysql from 'mysql2/promise';
import { loadConfig } from '../../config/env.config';

export const MYSQL_POOL_TOKEN = Symbol('MYSQL_POOL');

export const MysqlPoolProvider: Provider = {
  provide: MYSQL_POOL_TOKEN,
  useFactory: (): mysql.Pool => {
    const config = loadConfig();
    return mysql.createPool({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      database: config.mysql.database,
      connectionLimit: config.mysql.poolSize,
      timezone: '+00:00',
      dateStrings: false,
    });
  },
};
