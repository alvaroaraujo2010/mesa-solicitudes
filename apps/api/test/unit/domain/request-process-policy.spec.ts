import { RequestEntity } from '../../../src/domain/entities/request.entity';
import { RequestStatus } from '../../../src/domain/enums/request-status.enum';
import { TransitionAction } from '../../../src/domain/enums/transition-action.enum';
import { UserRole } from '../../../src/domain/enums/user-role.enum';
import { InvalidTransitionError } from '../../../src/domain/errors/invalid-transition.error';
import { RequestProcessPolicy } from '../../../src/domain/services/request-process.policy';

function makeEntity(status: RequestStatus): RequestEntity {
  return RequestEntity.fromPersistence({
    id: 'test-id',
    tenantId: 'tenant-1',
    title: 'Prueba',
    description: 'Descripción de prueba',
    status,
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('RequestProcessPolicy', () => {
  // ── Transiciones válidas ───────────────────────────────────────────────────

  describe('transiciones válidas', () => {
    it('REGISTRADA + atender + analista → EN_ATENCION', () => {
      const entity = makeEntity(RequestStatus.REGISTRADA);
      const next = RequestProcessPolicy.getNextStatus(entity, TransitionAction.ATENDER, UserRole.ANALISTA);
      expect(next).toBe(RequestStatus.EN_ATENCION);
    });

    it('EN_ATENCION + resolver + analista → RESUELTA', () => {
      const entity = makeEntity(RequestStatus.EN_ATENCION);
      const next = RequestProcessPolicy.getNextStatus(entity, TransitionAction.RESOLVER, UserRole.ANALISTA);
      expect(next).toBe(RequestStatus.RESUELTA);
    });

    it('RESUELTA + confirmar + filial → CERRADA', () => {
      const entity = makeEntity(RequestStatus.RESUELTA);
      const next = RequestProcessPolicy.getNextStatus(entity, TransitionAction.CONFIRMAR, UserRole.FILIAL);
      expect(next).toBe(RequestStatus.CERRADA);
    });

    it('RESUELTA + rechazar + filial → EN_ATENCION', () => {
      const entity = makeEntity(RequestStatus.RESUELTA);
      const next = RequestProcessPolicy.getNextStatus(entity, TransitionAction.RECHAZAR, UserRole.FILIAL);
      expect(next).toBe(RequestStatus.EN_ATENCION);
    });
  });

  // ── Solicitud CERRADA es inmutable ─────────────────────────────────────────

  describe('solicitud CERRADA (inmutable)', () => {
    const actions = Object.values(TransitionAction);
    const roles = Object.values(UserRole);

    actions.forEach((action) => {
      roles.forEach((role) => {
        it(`lanza error para acción "${action}" con rol "${role}" en estado CERRADA`, () => {
          const entity = makeEntity(RequestStatus.CERRADA);
          expect(() =>
            RequestProcessPolicy.getNextStatus(entity, action, role),
          ).toThrow(InvalidTransitionError);
        });
      });
    });

    it('el mensaje de error menciona que la solicitud está cerrada', () => {
      const entity = makeEntity(RequestStatus.CERRADA);
      expect(() =>
        RequestProcessPolicy.getNextStatus(entity, TransitionAction.ATENDER, UserRole.ANALISTA),
      ).toThrow(/cerrada/i);
    });
  });

  // ── Estado incorrecto para la acción ──────────────────────────────────────

  describe('estado incorrecto para la acción', () => {
    it('lanza error al intentar atender una solicitud EN_ATENCION', () => {
      const entity = makeEntity(RequestStatus.EN_ATENCION);
      expect(() =>
        RequestProcessPolicy.getNextStatus(entity, TransitionAction.ATENDER, UserRole.ANALISTA),
      ).toThrow(InvalidTransitionError);
    });

    it('lanza error al intentar resolver una solicitud REGISTRADA', () => {
      const entity = makeEntity(RequestStatus.REGISTRADA);
      expect(() =>
        RequestProcessPolicy.getNextStatus(entity, TransitionAction.RESOLVER, UserRole.ANALISTA),
      ).toThrow(InvalidTransitionError);
    });

    it('lanza error al intentar confirmar una solicitud REGISTRADA', () => {
      const entity = makeEntity(RequestStatus.REGISTRADA);
      expect(() =>
        RequestProcessPolicy.getNextStatus(entity, TransitionAction.CONFIRMAR, UserRole.FILIAL),
      ).toThrow(InvalidTransitionError);
    });

    it('lanza error al intentar rechazar una solicitud EN_ATENCION', () => {
      const entity = makeEntity(RequestStatus.EN_ATENCION);
      expect(() =>
        RequestProcessPolicy.getNextStatus(entity, TransitionAction.RECHAZAR, UserRole.FILIAL),
      ).toThrow(InvalidTransitionError);
    });

    it('el mensaje indica el estado actual y el estado requerido', () => {
      const entity = makeEntity(RequestStatus.EN_ATENCION);
      let caught: unknown;
      try {
        RequestProcessPolicy.getNextStatus(entity, TransitionAction.ATENDER, UserRole.ANALISTA);
        throw new Error('Debería haber lanzado InvalidTransitionError');
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(InvalidTransitionError);
      expect((caught as Error).message).toMatch(/EN_ATENCION/);
      expect((caught as Error).message).toMatch(/REGISTRADA/);
    });
  });

  // ── Rol incorrecto para la acción ─────────────────────────────────────────

  describe('rol incorrecto para la acción', () => {
    it('lanza error si filial intenta atender (acción exclusiva de analista)', () => {
      const entity = makeEntity(RequestStatus.REGISTRADA);
      expect(() =>
        RequestProcessPolicy.getNextStatus(entity, TransitionAction.ATENDER, UserRole.FILIAL),
      ).toThrow(InvalidTransitionError);
    });

    it('lanza error si filial intenta resolver (acción exclusiva de analista)', () => {
      const entity = makeEntity(RequestStatus.EN_ATENCION);
      expect(() =>
        RequestProcessPolicy.getNextStatus(entity, TransitionAction.RESOLVER, UserRole.FILIAL),
      ).toThrow(InvalidTransitionError);
    });

    it('lanza error si analista intenta confirmar (acción exclusiva de filial)', () => {
      const entity = makeEntity(RequestStatus.RESUELTA);
      expect(() =>
        RequestProcessPolicy.getNextStatus(entity, TransitionAction.CONFIRMAR, UserRole.ANALISTA),
      ).toThrow(InvalidTransitionError);
    });

    it('lanza error si analista intenta rechazar (acción exclusiva de filial)', () => {
      const entity = makeEntity(RequestStatus.RESUELTA);
      expect(() =>
        RequestProcessPolicy.getNextStatus(entity, TransitionAction.RECHAZAR, UserRole.ANALISTA),
      ).toThrow(InvalidTransitionError);
    });

    it('el mensaje de error menciona el rol requerido', () => {
      const entity = makeEntity(RequestStatus.REGISTRADA);
      let caught: unknown;
      try {
        RequestProcessPolicy.getNextStatus(entity, TransitionAction.ATENDER, UserRole.FILIAL);
        throw new Error('Debería haber lanzado InvalidTransitionError');
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(InvalidTransitionError);
      expect((caught as Error).message).toMatch(/analista/i);
    });
  });

  // ── Acción inválida ───────────────────────────────────────────────────────

  describe('acción inválida', () => {
    it('lanza error con acción no reconocida', () => {
      const entity = makeEntity(RequestStatus.REGISTRADA);
      expect(() =>
        RequestProcessPolicy.getNextStatus(entity, 'accion_inexistente' as TransitionAction, UserRole.ANALISTA),
      ).toThrow(InvalidTransitionError);
    });
  });
});
