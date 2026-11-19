import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RequestEntity } from '../../domain/entities/request.entity';
import { RequestStatus } from '../../domain/enums/request-status.enum';
import { IRequestRepository } from '../../domain/repositories/request.repository.interface';
import { REQUEST_REPOSITORY_TOKEN } from '../ports/request-repository.port';

const SAMPLE_TITLES = [
  'Solicitud de acceso al sistema',
  'Reporte de incidencia técnica',
  'Consulta sobre facturación',
  'Actualización de datos de contacto',
  'Requerimiento de soporte',
  'Solicitud de nuevo usuario',
  'Error en módulo de reportes',
  'Falla de conectividad',
  'Ajuste de permisos',
  'Solicitud de capacitación',
];

function randomStatus(): RequestStatus {
  const statuses = Object.values(RequestStatus);
  return statuses[Math.floor(Math.random() * statuses.length)];
}

function randomTitle(): string {
  return SAMPLE_TITLES[Math.floor(Math.random() * SAMPLE_TITLES.length)];
}

function randomDate(from: Date, to: Date): Date {
  return new Date(from.getTime() + Math.random() * (to.getTime() - from.getTime()));
}

@Injectable()
export class SeedUseCase {
  constructor(
    @Inject(REQUEST_REPOSITORY_TOKEN)
    private readonly repository: IRequestRepository,
  ) {}

  async execute(tenantId: string, count: number): Promise<{ tenantId: string; count: number }> {
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const entities: RequestEntity[] = [];

    for (let i = 0; i < count; i++) {
      const createdAt = randomDate(sixMonthsAgo, now);
      const status = randomStatus();
      entities.push(
        RequestEntity.fromPersistence({
          id: randomUUID(),
          tenantId,
          title: `${randomTitle()} #${i + 1}`,
          description: `Descripción generada para pruebas de volumen. Registro ${i + 1} de ${count}.`,
          status,
          createdBy: `seed-user-${(i % 10) + 1}`,
          createdAt,
          updatedAt: createdAt,
        }),
      );
    }

    await this.repository.bulkInsert(entities);
    return { tenantId, count };
  }
}
