export type RequestStatus = 'REGISTRADA' | 'EN_ATENCION' | 'RESUELTA' | 'CERRADA';
export type UserRole = 'filial' | 'analista';
export type TransitionAction = 'atender' | 'resolver' | 'confirmar' | 'rechazar';

export interface ServiceRequest {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  status: RequestStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedRequests {
  data: ServiceRequest[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SessionIdentity {
  tenantId: string;
  userId: string;
  userRole: UserRole;
  displayName: string;
}

export const STATUS_LABELS: Record<RequestStatus, string> = {
  REGISTRADA: 'Registrada',
  EN_ATENCION: 'En atención',
  RESUELTA: 'Resuelta',
  CERRADA: 'Cerrada',
};

export const ACTION_LABELS: Record<TransitionAction, string> = {
  atender: 'Atender',
  resolver: 'Marcar resuelta',
  confirmar: 'Confirmar y cerrar',
  rechazar: 'Rechazar solución',
};

/** Acciones disponibles según estado actual y rol de la sesión. */
export function availableActions(
  status: RequestStatus,
  role: UserRole,
): TransitionAction[] {
  if (status === 'CERRADA') {
    return [];
  }
  if (role === 'analista') {
    if (status === 'REGISTRADA') return ['atender'];
    if (status === 'EN_ATENCION') return ['resolver'];
    return [];
  }
  if (role === 'filial') {
    if (status === 'RESUELTA') return ['confirmar', 'rechazar'];
    return [];
  }
  return [];
}
