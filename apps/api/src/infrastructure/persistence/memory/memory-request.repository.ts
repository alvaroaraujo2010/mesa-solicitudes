import { Injectable } from '@nestjs/common';
import { RequestEntity } from '../../../domain/entities/request.entity';
import {
  FindAllParams,
  FindAllResult,
  IRequestRepository,
} from '../../../domain/repositories/request.repository.interface';

@Injectable()
export class MemoryRequestRepository implements IRequestRepository {
  private readonly store = new Map<string, RequestEntity>();

  async save(entity: RequestEntity): Promise<void> {
    this.store.set(entity.id, this.clone(entity));
  }

  async findById(id: string, tenantId: string): Promise<RequestEntity | null> {
    const entity = this.store.get(id);
    if (!entity || entity.tenantId !== tenantId) {
      return null;
    }
    return this.clone(entity);
  }

  async findAll(params: FindAllParams): Promise<FindAllResult> {
    let items = Array.from(this.store.values()).filter(
      (r) => r.tenantId === params.tenantId,
    );

    if (params.status) {
      items = items.filter((r) => r.status === params.status);
    }

    if (params.q) {
      const q = params.q.toLowerCase();
      items = items.filter(
        (r) => r.id.toLowerCase().includes(q) || r.title.toLowerCase().includes(q),
      );
    }

    // Sort by createdAt descending
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = items.length;
    const start = (params.page - 1) * params.pageSize;
    const paginatedItems = items.slice(start, start + params.pageSize);

    return {
      items: paginatedItems.map((item) => this.clone(item)),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async update(entity: RequestEntity): Promise<void> {
    if (!this.store.has(entity.id)) {
      return;
    }
    this.store.set(entity.id, this.clone(entity));
  }

  async bulkInsert(entities: RequestEntity[]): Promise<void> {
    for (const entity of entities) {
      this.store.set(entity.id, this.clone(entity));
    }
  }

  clear(): void {
    this.store.clear();
  }

  private clone(entity: RequestEntity): RequestEntity {
    return RequestEntity.fromPersistence({
      id: entity.id,
      tenantId: entity.tenantId,
      title: entity.title,
      description: entity.description,
      status: entity.status,
      createdBy: entity.createdBy,
      createdAt: new Date(entity.createdAt),
      updatedAt: new Date(entity.updatedAt),
    });
  }
}
