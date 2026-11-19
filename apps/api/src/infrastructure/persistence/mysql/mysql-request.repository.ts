import { Inject, Injectable } from '@nestjs/common';
import * as mysql from 'mysql2/promise';
import { RequestEntity } from '../../../domain/entities/request.entity';
import { RequestStatus } from '../../../domain/enums/request-status.enum';
import {
  FindAllParams,
  FindAllResult,
  IRequestRepository,
} from '../../../domain/repositories/request.repository.interface';
import { MYSQL_POOL_TOKEN } from './mysql.provider';

interface RequestRow {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  status: RequestStatus;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

function rowToEntity(row: RequestRow): RequestEntity {
  return RequestEntity.fromPersistence({
    id: row.id,
    tenantId: row.tenant_id,
    title: row.title,
    description: row.description,
    status: row.status,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });
}

@Injectable()
export class MysqlRequestRepository implements IRequestRepository {
  constructor(@Inject(MYSQL_POOL_TOKEN) private readonly pool: mysql.Pool) {}

  async save(entity: RequestEntity): Promise<void> {
    await this.pool.execute(
      `INSERT INTO requests (id, tenant_id, title, description, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entity.id,
        entity.tenantId,
        entity.title,
        entity.description,
        entity.status,
        entity.createdBy,
        entity.createdAt,
        entity.updatedAt,
      ],
    );
  }

  async findById(id: string, tenantId: string): Promise<RequestEntity | null> {
    const [rows] = await this.pool.execute<mysql.RowDataPacket[]>(
      'SELECT * FROM requests WHERE id = ? AND tenant_id = ? LIMIT 1',
      [id, tenantId],
    );
    if (rows.length === 0) return null;
    return rowToEntity(rows[0] as RequestRow);
  }

  async findAll(params: FindAllParams): Promise<FindAllResult> {
    const conditions: string[] = ['tenant_id = ?'];
    const values: Array<string | number> = [params.tenantId];

    if (params.status) {
      conditions.push('status = ?');
      values.push(params.status);
    }

    if (params.q) {
      conditions.push('(id LIKE ? OR title LIKE ?)');
      const like = `%${params.q}%`;
      values.push(like, like);
    }

    const where = conditions.join(' AND ');
    const offset = (params.page - 1) * params.pageSize;

    const [countRows] = await this.pool.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM requests WHERE ${where}`,
      values,
    );
    const total = Number((countRows[0] as { total: number }).total);

    // mysql2 prepared statements no aceptan LIMIT/OFFSET como placeholders de forma fiable
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      `SELECT * FROM requests WHERE ${where} ORDER BY created_at DESC LIMIT ${Number(params.pageSize)} OFFSET ${Number(offset)}`,
      values,
    );

    return {
      items: (rows as RequestRow[]).map(rowToEntity),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async update(entity: RequestEntity): Promise<void> {
    await this.pool.execute(
      'UPDATE requests SET status = ?, updated_at = ? WHERE id = ? AND tenant_id = ?',
      [entity.status, entity.updatedAt, entity.id, entity.tenantId],
    );
  }

  async bulkInsert(entities: RequestEntity[]): Promise<void> {
    if (entities.length === 0) return;

    const BATCH_SIZE = 1000;
    const conn = await this.pool.getConnection();

    try {
      await conn.beginTransaction();

      for (let i = 0; i < entities.length; i += BATCH_SIZE) {
        const batch = entities.slice(i, i + BATCH_SIZE);
        const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const values: Array<string | Date> = [];
        for (const e of batch) {
          values.push(
            e.id,
            e.tenantId,
            e.title,
            e.description,
            e.status,
            e.createdBy,
            e.createdAt,
            e.updatedAt,
          );
        }
        await conn.query(
          `INSERT INTO requests (id, tenant_id, title, description, status, created_by, created_at, updated_at)
           VALUES ${placeholders}`,
          values,
        );
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}
