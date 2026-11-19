import { ListRequestsUseCase } from '../../../src/application/use-cases/list-requests.use-case';
import { REQUEST_REPOSITORY_TOKEN } from '../../../src/application/ports/request-repository.port';
import { RequestEntity } from '../../../src/domain/entities/request.entity';
import { RequestStatus } from '../../../src/domain/enums/request-status.enum';
import { MemoryRequestRepository } from '../../../src/infrastructure/persistence/memory/memory-request.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';

function makeEntity(tenantId: string, status: RequestStatus, title = 'Solicitud'): RequestEntity {
  return RequestEntity.fromPersistence({
    id: randomUUID(),
    tenantId,
    title,
    description: 'Descripción de prueba',
    status,
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('ListRequestsUseCase', () => {
  let useCase: ListRequestsUseCase;
  let repository: MemoryRequestRepository;

  beforeEach(async () => {
    repository = new MemoryRequestRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListRequestsUseCase,
        { provide: REQUEST_REPOSITORY_TOKEN, useValue: repository },
      ],
    }).compile();

    useCase = module.get(ListRequestsUseCase);
  });

  afterEach(() => repository.clear());

  // ── Aislamiento de tenant ────────────────────────────────────────────────

  it('aislamiento: solo devuelve solicitudes del tenant propio', async () => {
    await repository.save(makeEntity('tenant-A', RequestStatus.REGISTRADA));
    await repository.save(makeEntity('tenant-A', RequestStatus.REGISTRADA));
    await repository.save(makeEntity('tenant-B', RequestStatus.REGISTRADA));

    const result = await useCase.execute({}, 'tenant-A');

    expect(result.data.every((e) => e.tenantId === 'tenant-A')).toBe(true);
    expect(result.total).toBe(2);
  });

  // ── Paginación ────────────────────────────────────────────────────────────

  it('devuelve la primera página con pageSize por defecto (20)', async () => {
    for (let i = 0; i < 25; i++) {
      await repository.save(makeEntity('tenant-A', RequestStatus.REGISTRADA));
    }

    const result = await useCase.execute({}, 'tenant-A');

    expect(result.data.length).toBe(20);
    expect(result.total).toBe(25);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.totalPages).toBe(2);
  });

  it('devuelve la segunda página correctamente', async () => {
    for (let i = 0; i < 25; i++) {
      await repository.save(makeEntity('tenant-A', RequestStatus.REGISTRADA));
    }

    const result = await useCase.execute({ page: 2, pageSize: 20 }, 'tenant-A');

    expect(result.data.length).toBe(5);
    expect(result.page).toBe(2);
  });

  it('limita pageSize a 100 como máximo', async () => {
    for (let i = 0; i < 10; i++) {
      await repository.save(makeEntity('tenant-A', RequestStatus.REGISTRADA));
    }

    const result = await useCase.execute({ pageSize: 200 }, 'tenant-A');

    expect(result.pageSize).toBe(100);
  });

  // ── Filtro por estado ─────────────────────────────────────────────────────

  it('filtra por estado correctamente', async () => {
    await repository.save(makeEntity('tenant-A', RequestStatus.REGISTRADA));
    await repository.save(makeEntity('tenant-A', RequestStatus.EN_ATENCION));
    await repository.save(makeEntity('tenant-A', RequestStatus.RESUELTA));

    const result = await useCase.execute({ status: RequestStatus.EN_ATENCION }, 'tenant-A');

    expect(result.total).toBe(1);
    expect(result.data[0].status).toBe(RequestStatus.EN_ATENCION);
  });

  it('devuelve cero resultados si no hay solicitudes con el estado indicado', async () => {
    await repository.save(makeEntity('tenant-A', RequestStatus.REGISTRADA));

    const result = await useCase.execute({ status: RequestStatus.CERRADA }, 'tenant-A');

    expect(result.total).toBe(0);
    expect(result.data).toHaveLength(0);
  });

  // ── Búsqueda por título ───────────────────────────────────────────────────

  it('busca por fragmento de título (q)', async () => {
    await repository.save(makeEntity('tenant-A', RequestStatus.REGISTRADA, 'Fallo de red'));
    await repository.save(makeEntity('tenant-A', RequestStatus.REGISTRADA, 'Error en base de datos'));
    await repository.save(makeEntity('tenant-A', RequestStatus.REGISTRADA, 'Solicitud de acceso'));

    const result = await useCase.execute({ q: 'fallo' }, 'tenant-A');

    expect(result.total).toBe(1);
    expect(result.data[0].title).toBe('Fallo de red');
  });

  it('devuelve vacío si la búsqueda no coincide con ningún título', async () => {
    await repository.save(makeEntity('tenant-A', RequestStatus.REGISTRADA, 'Fallo de red'));

    const result = await useCase.execute({ q: 'xyz_no_existe' }, 'tenant-A');

    expect(result.total).toBe(0);
  });

  it('devuelve vacío si el tenant no tiene solicitudes', async () => {
    const result = await useCase.execute({}, 'tenant-sin-datos');
    expect(result.total).toBe(0);
    expect(result.data).toHaveLength(0);
  });
});
