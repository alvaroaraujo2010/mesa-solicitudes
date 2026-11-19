import { GetRequestUseCase } from '../../../src/application/use-cases/get-request.use-case';
import { REQUEST_REPOSITORY_TOKEN } from '../../../src/application/ports/request-repository.port';
import { RequestEntity } from '../../../src/domain/entities/request.entity';
import { RequestStatus } from '../../../src/domain/enums/request-status.enum';
import { RequestNotFoundError } from '../../../src/domain/errors/request-not-found.error';
import { MemoryRequestRepository } from '../../../src/infrastructure/persistence/memory/memory-request.repository';
import { Test, TestingModule } from '@nestjs/testing';

function makeEntity(id: string, tenantId: string): RequestEntity {
  return RequestEntity.fromPersistence({
    id,
    tenantId,
    title: 'Título de prueba',
    description: 'Descripción',
    status: RequestStatus.REGISTRADA,
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('GetRequestUseCase', () => {
  let useCase: GetRequestUseCase;
  let repository: MemoryRequestRepository;

  beforeEach(async () => {
    repository = new MemoryRequestRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetRequestUseCase,
        { provide: REQUEST_REPOSITORY_TOKEN, useValue: repository },
      ],
    }).compile();

    useCase = module.get(GetRequestUseCase);
  });

  afterEach(() => repository.clear());

  it('devuelve la solicitud si pertenece al tenant correcto', async () => {
    const entity = makeEntity('req-1', 'tenant-A');
    await repository.save(entity);

    const found = await useCase.execute('req-1', 'tenant-A');
    expect(found.id).toBe('req-1');
    expect(found.tenantId).toBe('tenant-A');
  });

  it('lanza RequestNotFoundError si la solicitud no existe', async () => {
    await expect(useCase.execute('id-inexistente', 'tenant-A')).rejects.toThrow(
      RequestNotFoundError,
    );
  });

  it('aislamiento de tenant: lanza 404 opaco al acceder a solicitud de otro tenant', async () => {
    const entity = makeEntity('req-1', 'tenant-A');
    await repository.save(entity);

    // Tenant B no debería saber que req-1 existe en tenant-A
    await expect(useCase.execute('req-1', 'tenant-B')).rejects.toThrow(RequestNotFoundError);
  });

  it('el mensaje de error es igual al lanzar 404 propio vs 404 cruzado (opaco)', async () => {
    const entity = makeEntity('req-existe', 'tenant-A');
    await repository.save(entity);

    let msgCruzado = '';
    let msgInexistente = '';

    try {
      await useCase.execute('req-existe', 'tenant-B');
    } catch (e) {
      msgCruzado = (e as Error).message;
    }

    try {
      await useCase.execute('req-no-existe', 'tenant-B');
    } catch (e) {
      msgInexistente = (e as Error).message;
    }

    expect(msgCruzado).toBe(msgInexistente);
  });
});
