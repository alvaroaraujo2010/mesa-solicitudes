import { RequestEntity } from '../entities/request.entity';
import { RequestStatus } from '../enums/request-status.enum';

export interface FindAllParams {
  tenantId: string;
  status?: RequestStatus;
  q?: string;
  page: number;
  pageSize: number;
}

export interface FindAllResult {
  items: RequestEntity[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IRequestRepository {
  save(entity: RequestEntity): Promise<void>;
  findById(id: string, tenantId: string): Promise<RequestEntity | null>;
  findAll(params: FindAllParams): Promise<FindAllResult>;
  update(entity: RequestEntity): Promise<void>;
  bulkInsert(entities: RequestEntity[]): Promise<void>;
}
