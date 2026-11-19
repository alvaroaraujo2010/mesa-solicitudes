import { Inject, Injectable } from '@nestjs/common';
import { IRequestRepository } from '../../domain/repositories/request.repository.interface';
import { REQUEST_REPOSITORY_TOKEN } from '../ports/request-repository.port';
import { ListRequestsQueryDto } from '../dto/list-requests-query.dto';
import { PaginatedResultDto } from '../dto/paginated-result.dto';
import { RequestEntity } from '../../domain/entities/request.entity';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

@Injectable()
export class ListRequestsUseCase {
  constructor(
    @Inject(REQUEST_REPOSITORY_TOKEN)
    private readonly repository: IRequestRepository,
  ) {}

  async execute(
    query: ListRequestsQueryDto,
    tenantId: string,
  ): Promise<PaginatedResultDto<RequestEntity>> {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = Math.min(query.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const result = await this.repository.findAll({
      tenantId,
      status: query.status,
      q: query.q,
      page,
      pageSize,
    });

    return new PaginatedResultDto(result.items, result.total, result.page, result.pageSize);
  }
}
