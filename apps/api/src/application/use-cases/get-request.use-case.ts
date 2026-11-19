import { Inject, Injectable } from '@nestjs/common';
import { RequestEntity } from '../../domain/entities/request.entity';
import { RequestNotFoundError } from '../../domain/errors/request-not-found.error';
import { IRequestRepository } from '../../domain/repositories/request.repository.interface';
import { REQUEST_REPOSITORY_TOKEN } from '../ports/request-repository.port';

@Injectable()
export class GetRequestUseCase {
  constructor(
    @Inject(REQUEST_REPOSITORY_TOKEN)
    private readonly repository: IRequestRepository,
  ) {}

  async execute(id: string, tenantId: string): Promise<RequestEntity> {
    const entity = await this.repository.findById(id, tenantId);
    // Respuesta opaca: no se revela si el recurso existe en otro tenant
    if (!entity) {
      throw new RequestNotFoundError();
    }
    return entity;
  }
}
