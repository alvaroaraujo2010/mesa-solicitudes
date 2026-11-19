import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../domain/enums/user-role.enum';

export interface TenantContext {
  tenantId: string;
  userId: string;
  userRole: UserRole;
}

export const GetTenantContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest<{ tenantContext: TenantContext }>();
    return request.tenantContext;
  },
);
