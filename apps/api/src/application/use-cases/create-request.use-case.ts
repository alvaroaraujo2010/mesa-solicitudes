import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RequestEntity } from '../../domain/entities/request.entity';
import { UserRole } from '../../domain/enums/user-role.enum';
import { ForbiddenOperationError } from '../../domain/errors/forbidden-operation.error';
import { IRequestRepository } from '../../domain/repositories/request.repository.interface';
import { REQUEST_REPOSITORY_TOKEN } from '../ports/request-repository.port';
import { CreateRequestDto } from '../dto/create-request.dto';

export interface CreateRequestCommand {
  dto: CreateRequestDto;
  tenantId: string;
  userId: string;
  userRole: UserRole;
}

@Injectable()
export class CreateRequestUseCase {
  constructor(
    @Inject(REQUEST_REPOSITORY_TOKEN)
    private readonly repository: IRequestRepository,
  ) {}

  async execute(command: CreateRequestCommand): Promise<RequestEntity> {
    if (command.userRole !== UserRole.FILIAL) {
      throw new ForbiddenOperationError('Solo las filiales pueden crear solicitudes.');
    }

    const entity = RequestEntity.create({
      id: randomUUID(),
      tenantId: command.tenantId,
      title: command.dto.title,
      description: command.dto.description,
      createdBy: command.userId,
    });

    await this.repository.save(entity);
    return entity;
  }
}
