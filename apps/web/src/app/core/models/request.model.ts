export type RequestStatus = 'REGISTRADA' | 'EN_ATENCION' | 'RESUELTA' | 'CERRADA';
export type UserRole = 'filial' | 'analista';

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
