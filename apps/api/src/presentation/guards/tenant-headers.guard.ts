import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '../../domain/enums/user-role.enum';
import { TenantContext } from '../decorators/tenant-context.decorator';

@Injectable()
export class TenantHeadersGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { tenantContext: TenantContext }>();

    const tenantId = req.headers['x-tenant-id'] as string | undefined;
    const userId = req.headers['x-user-id'] as string | undefined;
    const userRole = req.headers['x-user-role'] as string | undefined;

    if (!tenantId) {
      throw new BadRequestException('La cabecera X-Tenant-Id es obligatoria.');
    }
    if (!userId) {
      throw new BadRequestException('La cabecera X-User-Id es obligatoria.');
    }
    if (!userRole) {
      throw new BadRequestException('La cabecera X-User-Role es obligatoria.');
    }

    const validRoles = Object.values(UserRole) as string[];
    if (!validRoles.includes(userRole)) {
      throw new BadRequestException(
        `El rol "${userRole}" no es válido. Valores permitidos: ${validRoles.join(', ')}.`,
      );
    }

    req.tenantContext = {
      tenantId,
      userId,
      userRole: userRole as UserRole,
    };

    return true;
  }
}
