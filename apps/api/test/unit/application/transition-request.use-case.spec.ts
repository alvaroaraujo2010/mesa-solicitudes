import { TransitionRequestUseCase } from '../../../src/application/use-cases/transition-request.use-case';
import { REQUEST_REPOSITORY_TOKEN } from '../../../src/application/ports/request-repository.port';
import { RequestEntity } from '../../../src/domain/entities/request.entity';
import { RequestStatus } from '../../../src/domain/enums/request-status.enum';
import { TransitionAction } from '../../../src/domain/enums/transition-action.enum';
import { UserRole } from '../../../src/domain/enums/user-role.enum';
import { InvalidTransitionError } from '../../../src/domain/errors/invalid-transition.error';
import { RequestNotFoundError } from '../../../src/domain/errors/request-not-found.error';
import { MemoryRequestRepository } from '../../../src/infrastructure/persistence/memory/memory-request.repository';
import { Test, TestingModule } from '@nestjs/testing';

function makeEntity(id: string, tenantId: string, status: RequestStatus): RequestEntity {
  return RequestEntity.fromPersistence({
    id,
    tenantId,
    title: 'Título de prueba',
    description: 'Descripción',
    status,
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('TransitionRequestUseCase', () => {
  let useCase: TransitionRequestUseCase;
  let repository: MemoryRequestRepository;

  beforeEach(async () => {
    repository = new MemoryRequestRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransitionRequestUseCase,
        { provide: REQUEST_REPOSITORY_TOKEN, useValue: repository },
      ],
    }).compile();

    useCase = module.get(TransitionRequestUseCase);
  });

  afterEach(() => repository.clear());

  // ── Transiciones válidas ───────────────────────────────────────────────────

  describe('flujo completo de transiciones', () => {
    it('REGISTRADA → EN_ATENCION (atender, analista)', async () => {
      await repository.save(makeEntity('req-1', 'tenant-1', RequestStatus.REGISTRADA));

      const result = await useCase.execute({
        id: 'req-1',
        tenantId: 'tenant-1',
        action: TransitionAction.ATENDER,
        userRole: UserRole.ANALISTA,
      });

      expect(result.status).toBe(RequestStatus.EN_ATENCION);
    });

    it('EN_ATENCION → RESUELTA (resolver, analista)', async () => {
      await repository.save(makeEntity('req-1', 'tenant-1', RequestStatus.EN_ATENCION));

      const result = await useCase.execute({
        id: 'req-1',
        tenantId: 'tenant-1',
        action: TransitionAction.RESOLVER,
        userRole: UserRole.ANALISTA,
      });

      expect(result.status).toBe(RequestStatus.RESUELTA);
    });

    it('RESUELTA → CERRADA (confirmar, filial)', async () => {
      await repository.save(makeEntity('req-1', 'tenant-1', RequestStatus.RESUELTA));

      const result = await useCase.execute({
        id: 'req-1',
        tenantId: 'tenant-1',
        action: TransitionAction.CONFIRMAR,
        userRole: UserRole.FILIAL,
      });

      expect(result.status).toBe(RequestStatus.CERRADA);
    });

    it('RESUELTA → EN_ATENCION (rechazar, filial)', async () => {
      await repository.save(makeEntity('req-1', 'tenant-1', RequestStatus.RESUELTA));

      const result = await useCase.execute({
        id: 'req-1',
        tenantId: 'tenant-1',
        action: TransitionAction.RECHAZAR,
        userRole: UserRole.FILIAL,
      });

      expect(result.status).toBe(RequestStatus.EN_ATENCION);
    });
  });

  // ── Persistencia de los cambios ────────────────────────────────────────────

  it('persiste el nuevo estado en el repositorio', async () => {
    await repository.save(makeEntity('req-1', 'tenant-1', RequestStatus.REGISTRADA));

    await useCase.execute({
      id: 'req-1',
      tenantId: 'tenant-1',
      action: TransitionAction.ATENDER,
      userRole: UserRole.ANALISTA,
    });

    const persisted = await repository.findById('req-1', 'tenant-1');
    expect(persisted?.status).toBe(RequestStatus.EN_ATENCION);
  });

  // ── Solicitud CERRADA es inmutable ─────────────────────────────────────────

  it('rechaza cualquier transición en una solicitud CERRADA', async () => {
    await repository.save(makeEntity('req-1', 'tenant-1', RequestStatus.CERRADA));

    await expect(
      useCase.execute({
        id: 'req-1',
        tenantId: 'tenant-1',
        action: TransitionAction.ATENDER,
        userRole: UserRole.ANALISTA,
      }),
    ).rejects.toThrow(InvalidTransitionError);
  });

  it('no modifica la solicitud si la transición es inválida', async () => {
    await repository.save(makeEntity('req-1', 'tenant-1', RequestStatus.CERRADA));

    try {
      await useCase.execute({
        id: 'req-1',
        tenantId: 'tenant-1',
        action: TransitionAction.ATENDER,
        userRole: UserRole.ANALISTA,
      });
    } catch {
      // esperado
    }

    const persisted = await repository.findById('req-1', 'tenant-1');
    expect(persisted?.status).toBe(RequestStatus.CERRADA);
  });

  // ── Transición con estado incorrecto ──────────────────────────────────────

  it('lanza error si se intenta confirmar una solicitud REGISTRADA', async () => {
    await repository.save(makeEntity('req-1', 'tenant-1', RequestStatus.REGISTRADA));

    await expect(
      useCase.execute({
        id: 'req-1',
        tenantId: 'tenant-1',
        action: TransitionAction.CONFIRMAR,
        userRole: UserRole.FILIAL,
      }),
    ).rejects.toThrow(InvalidTransitionError);
  });

  // ── Transición con rol incorrecto ─────────────────────────────────────────

  it('lanza error si filial intenta atender', async () => {
    await repository.save(makeEntity('req-1', 'tenant-1', RequestStatus.REGISTRADA));

    await expect(
      useCase.execute({
        id: 'req-1',
        tenantId: 'tenant-1',
        action: TransitionAction.ATENDER,
        userRole: UserRole.FILIAL,
      }),
    ).rejects.toThrow(InvalidTransitionError);
  });

  it('lanza error si analista intenta confirmar', async () => {
    await repository.save(makeEntity('req-1', 'tenant-1', RequestStatus.RESUELTA));

    await expect(
      useCase.execute({
        id: 'req-1',
        tenantId: 'tenant-1',
        action: TransitionAction.CONFIRMAR,
        userRole: UserRole.ANALISTA,
      }),
    ).rejects.toThrow(InvalidTransitionError);
  });

  // ── Aislamiento de tenant ────────────────────────────────────────────────

  it('aislamiento: lanza 404 opaco al acceder a solicitud de otro tenant', async () => {
    await repository.save(makeEntity('req-1', 'tenant-A', RequestStatus.REGISTRADA));

    await expect(
      useCase.execute({
        id: 'req-1',
        tenantId: 'tenant-B',
        action: TransitionAction.ATENDER,
        userRole: UserRole.ANALISTA,
      }),
    ).rejects.toThrow(RequestNotFoundError);
  });

  it('aislamiento: el mensaje de error es idéntico al acceso cruzado vs inexistente', async () => {
    await repository.save(makeEntity('req-existe', 'tenant-A', RequestStatus.REGISTRADA));

    let msgCruzado = '';
    let msgInexistente = '';

    try {
      await useCase.execute({
        id: 'req-existe',
        tenantId: 'tenant-B',
        action: TransitionAction.ATENDER,
        userRole: UserRole.ANALISTA,
      });
    } catch (e) {
      msgCruzado = (e as Error).message;
    }

    try {
      await useCase.execute({
        id: 'req-no-existe',
        tenantId: 'tenant-B',
        action: TransitionAction.ATENDER,
        userRole: UserRole.ANALISTA,
      });
    } catch (e) {
      msgInexistente = (e as Error).message;
    }

    expect(msgCruzado).toBe(msgInexistente);
  });

  // ── Solicitud no encontrada ───────────────────────────────────────────────

  it('lanza RequestNotFoundError si la solicitud no existe', async () => {
    await expect(
      useCase.execute({
        id: 'id-inexistente',
        tenantId: 'tenant-1',
        action: TransitionAction.ATENDER,
        userRole: UserRole.ANALISTA,
      }),
    ).rejects.toThrow(RequestNotFoundError);
  });
});
