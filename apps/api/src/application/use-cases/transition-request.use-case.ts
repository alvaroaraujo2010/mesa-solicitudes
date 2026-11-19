import { Inject, Injectable } from '@nestjs/common';
import { RequestEntity } from '../../domain/entities/request.entity';
import { TransitionAction } from '../../domain/enums/transition-action.enum';
import { UserRole } from '../../domain/enums/user-role.enum';
import { RequestNotFoundError } from '../../domain/errors/request-not-found.error';
import { IRequestRepository } from '../../domain/repositories/request.repository.interface';
import { RequestProcessPolicy } from '../../domain/services/request-process.policy';
import { REQUEST_REPOSITORY_TOKEN } from '../ports/request-repository.port';

export interface TransitionCommand {
  id: string;
  tenantId: string;
  action: TransitionAction;
  userRole: UserRole;
}

@Injectable()
export class TransitionRequestUseCase {
  constructor(
    @Inject(REQUEST_REPOSITORY_TOKEN)
    private readonly repository: IRequestRepository,
  ) {}

  async execute(command: TransitionCommand): Promise<RequestEntity> {
    const entity = await this.repository.findById(command.id, command.tenantId);

    // Respuesta opaca: no se revela si el recurso existe en otro tenant
    if (!entity) {
      throw new RequestNotFoundError();
    }

    const nextStatus = RequestProcessPolicy.getNextStatus(
      entity,
      command.action,
      command.userRole,
    );

    entity.applyTransition(nextStatus);
    await this.repository.update(entity);
    return entity;
  }
}
