import { RequestEntity } from '../entities/request.entity';
import { RequestStatus } from '../enums/request-status.enum';
import { TransitionAction } from '../enums/transition-action.enum';
import { UserRole } from '../enums/user-role.enum';
import { InvalidTransitionError } from '../errors/invalid-transition.error';

interface TransitionRule {
  fromStatus: RequestStatus;
  requiredRole: UserRole;
  toStatus: RequestStatus;
}

const TRANSITION_RULES: Record<TransitionAction, TransitionRule> = {
  [TransitionAction.ATENDER]: {
    fromStatus: RequestStatus.REGISTRADA,
    requiredRole: UserRole.ANALISTA,
    toStatus: RequestStatus.EN_ATENCION,
  },
  [TransitionAction.RESOLVER]: {
    fromStatus: RequestStatus.EN_ATENCION,
    requiredRole: UserRole.ANALISTA,
    toStatus: RequestStatus.RESUELTA,
  },
  [TransitionAction.CONFIRMAR]: {
    fromStatus: RequestStatus.RESUELTA,
    requiredRole: UserRole.FILIAL,
    toStatus: RequestStatus.CERRADA,
  },
  [TransitionAction.RECHAZAR]: {
    fromStatus: RequestStatus.RESUELTA,
    requiredRole: UserRole.FILIAL,
    toStatus: RequestStatus.EN_ATENCION,
  },
};

export class RequestProcessPolicy {
  /**
   * Valida la transición y retorna el nuevo estado si es válida.
   * Lanza InvalidTransitionError con mensaje en español si no lo es.
   */
  static getNextStatus(
    entity: RequestEntity,
    action: TransitionAction,
    role: UserRole,
  ): RequestStatus {
    if (entity.status === RequestStatus.CERRADA) {
      throw new InvalidTransitionError(
        'La solicitud se encuentra cerrada y no admite más cambios.',
      );
    }

    const rule = TRANSITION_RULES[action];

    if (!rule) {
      const valid = Object.values(TransitionAction).join(', ');
      throw new InvalidTransitionError(
        `La acción "${action}" no es válida. Las acciones permitidas son: ${valid}.`,
      );
    }

    if (entity.status !== rule.fromStatus) {
      throw new InvalidTransitionError(
        `No es posible ejecutar la acción "${action}" cuando la solicitud se encuentra en estado "${entity.status}". ` +
          `Se requiere el estado "${rule.fromStatus}".`,
      );
    }

    if (role !== rule.requiredRole) {
      throw new InvalidTransitionError(
        `La acción "${action}" solo puede ser ejecutada por un usuario con rol "${rule.requiredRole}". ` +
          `Su rol actual es "${role}".`,
      );
    }

    return rule.toStatus;
  }
}
