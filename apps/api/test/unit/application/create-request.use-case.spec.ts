import { CreateRequestUseCase } from '../../../src/application/use-cases/create-request.use-case';
import { REQUEST_REPOSITORY_TOKEN } from '../../../src/application/ports/request-repository.port';
import { RequestStatus } from '../../../src/domain/enums/request-status.enum';
import { UserRole } from '../../../src/domain/enums/user-role.enum';
import { ForbiddenOperationError } from '../../../src/domain/errors/forbidden-operation.error';
import { MemoryRequestRepository } from '../../../src/infrastructure/persistence/memory/memory-request.repository';
import { Test, TestingModule } from '@nestjs/testing';

describe('CreateRequestUseCase', () => {
  let useCase: CreateRequestUseCase;
  let repository: MemoryRequestRepository;

  beforeEach(async () => {
    repository = new MemoryRequestRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateRequestUseCase,
        { provide: REQUEST_REPOSITORY_TOKEN, useValue: repository },
      ],
    }).compile();

    useCase = module.get(CreateRequestUseCase);
  });

  afterEach(() => repository.clear());

  it('crea una solicitud con estado REGISTRADA', async () => {
    const entity = await useCase.execute({
      dto: { title: 'Solicitud de prueba', description: 'Descripción' },
      tenantId: 'tenant-1',
      userId: 'user-1',
      userRole: UserRole.FILIAL,
    });

    expect(entity.status).toBe(RequestStatus.REGISTRADA);
  });

  it('asigna un ID UUID al crear la solicitud', async () => {
    const entity = await useCase.execute({
      dto: { title: 'Título', description: 'Descripción' },
      tenantId: 'tenant-1',
      userId: 'user-1',
      userRole: UserRole.FILIAL,
    });

    // crypto.randomUUID() produces a standard v4 UUID
    expect(entity.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('asigna el tenantId correcto a la solicitud', async () => {
    const entity = await useCase.execute({
      dto: { title: 'Título', description: 'Descripción' },
      tenantId: 'mi-tenant',
      userId: 'user-1',
      userRole: UserRole.FILIAL,
    });

    expect(entity.tenantId).toBe('mi-tenant');
  });

  it('persiste la solicitud en el repositorio', async () => {
    const entity = await useCase.execute({
      dto: { title: 'Guardada', description: 'Descripción' },
      tenantId: 'tenant-1',
      userId: 'user-1',
      userRole: UserRole.FILIAL,
    });

    const found = await repository.findById(entity.id, 'tenant-1');
    expect(found).not.toBeNull();
    expect(found?.title).toBe('Guardada');
  });

  it('rechaza la creación si el rol es analista', async () => {
    await expect(
      useCase.execute({
        dto: { title: 'Título', description: 'Descripción' },
        tenantId: 'tenant-1',
        userId: 'user-1',
        userRole: UserRole.ANALISTA,
      }),
    ).rejects.toThrow(ForbiddenOperationError);
  });

  it('aísla por tenant: la solicitud no es visible en otro tenant', async () => {
    const entity = await useCase.execute({
      dto: { title: 'Título', description: 'Descripción' },
      tenantId: 'tenant-A',
      userId: 'user-1',
      userRole: UserRole.FILIAL,
    });

    const fromOtherTenant = await repository.findById(entity.id, 'tenant-B');
    expect(fromOtherTenant).toBeNull();
  });
});
