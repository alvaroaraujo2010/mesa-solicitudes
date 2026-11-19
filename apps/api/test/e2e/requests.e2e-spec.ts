import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { REQUEST_REPOSITORY_TOKEN } from '../../src/application/ports/request-repository.port';
import { MemoryRequestRepository } from '../../src/infrastructure/persistence/memory/memory-request.repository';

describe('Requests E2E', () => {
  let app: INestApplication;
  let repository: MemoryRequestRepository;

  const HEADERS_FILIAL = {
    'x-tenant-id': 'e2e-tenant',
    'x-user-id': 'user-filial',
    'x-user-role': 'filial',
  };

  const HEADERS_ANALISTA = {
    'x-tenant-id': 'e2e-tenant',
    'x-user-id': 'user-analista',
    'x-user-role': 'analista',
  };

  const HEADERS_OTHER_TENANT = {
    'x-tenant-id': 'otro-tenant',
    'x-user-id': 'user-otro',
    'x-user-role': 'filial',
  };

  beforeAll(async () => {
    // Force memory adapter for E2E tests
    process.env['PERSISTENCE_ADAPTER'] = 'memory';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    repository = moduleFixture.get<MemoryRequestRepository>(REQUEST_REPOSITORY_TOKEN);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    if (repository && typeof (repository as MemoryRequestRepository).clear === 'function') {
      (repository as MemoryRequestRepository).clear();
    }
  });

  // ── Health ────────────────────────────────────────────────────────────────

  describe('GET /health', () => {
    it('retorna status ok', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
        });
    });
  });

  // ── Crear solicitud ───────────────────────────────────────────────────────

  describe('POST /requests', () => {
    it('crea una solicitud correctamente', () => {
      return request(app.getHttpServer())
        .post('/requests')
        .set(HEADERS_FILIAL)
        .send({ title: 'Mi solicitud', description: 'Descripción detallada' })
        .expect(201)
        .expect((res) => {
          expect(res.body.status).toBe('REGISTRADA');
          expect(res.body.id).toBeDefined();
          expect(res.body.tenantId).toBe('e2e-tenant');
        });
    });

    it('rechaza creación sin cabeceras de tenant', () => {
      return request(app.getHttpServer())
        .post('/requests')
        .send({ title: 'Sin cabeceras', description: 'Descripción' })
        .expect(400);
    });

    it('rechaza creación con rol analista (solo filial puede crear)', () => {
      return request(app.getHttpServer())
        .post('/requests')
        .set(HEADERS_ANALISTA)
        .send({ title: 'Intento de analista', description: 'Descripción' })
        .expect(403);
    });

    it('rechaza creación sin título', () => {
      return request(app.getHttpServer())
        .post('/requests')
        .set(HEADERS_FILIAL)
        .send({ description: 'Sin título' })
        .expect(400);
    });
  });

  // ── Listar solicitudes ────────────────────────────────────────────────────

  describe('GET /requests', () => {
    it('lista solicitudes del tenant propio', async () => {
      await request(app.getHttpServer())
        .post('/requests')
        .set(HEADERS_FILIAL)
        .send({ title: 'Solicitud 1', description: 'Desc 1' });

      return request(app.getHttpServer())
        .get('/requests')
        .set(HEADERS_FILIAL)
        .expect(200)
        .expect((res) => {
          expect(res.body.total).toBeGreaterThanOrEqual(1);
          expect(res.body.data).toBeDefined();
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('no devuelve solicitudes de otro tenant', async () => {
      await request(app.getHttpServer())
        .post('/requests')
        .set(HEADERS_FILIAL)
        .send({ title: 'Solicitud de e2e-tenant', description: 'Desc' });

      return request(app.getHttpServer())
        .get('/requests')
        .set(HEADERS_OTHER_TENANT)
        .expect(200)
        .expect((res) => {
          expect(res.body.total).toBe(0);
        });
    });

    it('filtra por estado', async () => {
      const resp = await request(app.getHttpServer())
        .post('/requests')
        .set(HEADERS_FILIAL)
        .send({ title: 'Para filtrar', description: 'Desc' });

      const id = resp.body.id as string;

      await request(app.getHttpServer())
        .post(`/requests/${id}/transitions`)
        .set(HEADERS_ANALISTA)
        .send({ action: 'atender' });

      const listResp = await request(app.getHttpServer())
        .get('/requests?status=EN_ATENCION')
        .set(HEADERS_ANALISTA);

      expect(listResp.body.data.some((r: { id: string }) => r.id === id)).toBe(true);
    });
  });

  // ── Obtener una solicitud ─────────────────────────────────────────────────

  describe('GET /requests/:id', () => {
    it('devuelve la solicitud si es del mismo tenant', async () => {
      const created = await request(app.getHttpServer())
        .post('/requests')
        .set(HEADERS_FILIAL)
        .send({ title: 'Obtener por id', description: 'Desc' });

      const id = created.body.id as string;

      return request(app.getHttpServer())
        .get(`/requests/${id}`)
        .set(HEADERS_FILIAL)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(id);
        });
    });

    it('devuelve 404 opaco si es de otro tenant', async () => {
      const created = await request(app.getHttpServer())
        .post('/requests')
        .set(HEADERS_FILIAL)
        .send({ title: 'Oculta para otro tenant', description: 'Desc' });

      const id = created.body.id as string;

      return request(app.getHttpServer())
        .get(`/requests/${id}`)
        .set(HEADERS_OTHER_TENANT)
        .expect(404);
    });

    it('devuelve 404 para id inexistente', () => {
      return request(app.getHttpServer())
        .get('/requests/00000000-0000-4000-8000-000000000000')
        .set(HEADERS_FILIAL)
        .expect(404);
    });
  });

  // ── Transiciones ─────────────────────────────────────────────────────────

  describe('POST /requests/:id/transitions', () => {
    async function createRequest(): Promise<string> {
      const resp = await request(app.getHttpServer())
        .post('/requests')
        .set(HEADERS_FILIAL)
        .send({ title: 'Para transición', description: 'Desc' });
      return resp.body.id as string;
    }

    it('flujo completo: REGISTRADA → EN_ATENCION → RESUELTA → CERRADA', async () => {
      const id = await createRequest();

      await request(app.getHttpServer())
        .post(`/requests/${id}/transitions`)
        .set(HEADERS_ANALISTA)
        .send({ action: 'atender' })
        .expect(200)
        .expect((r) => expect(r.body.status).toBe('EN_ATENCION'));

      await request(app.getHttpServer())
        .post(`/requests/${id}/transitions`)
        .set(HEADERS_ANALISTA)
        .send({ action: 'resolver' })
        .expect(200)
        .expect((r) => expect(r.body.status).toBe('RESUELTA'));

      await request(app.getHttpServer())
        .post(`/requests/${id}/transitions`)
        .set(HEADERS_FILIAL)
        .send({ action: 'confirmar' })
        .expect(200)
        .expect((r) => expect(r.body.status).toBe('CERRADA'));
    });

    it('rechazo y re-atención: RESUELTA → EN_ATENCION', async () => {
      const id = await createRequest();

      await request(app.getHttpServer())
        .post(`/requests/${id}/transitions`)
        .set(HEADERS_ANALISTA)
        .send({ action: 'atender' });

      await request(app.getHttpServer())
        .post(`/requests/${id}/transitions`)
        .set(HEADERS_ANALISTA)
        .send({ action: 'resolver' });

      await request(app.getHttpServer())
        .post(`/requests/${id}/transitions`)
        .set(HEADERS_FILIAL)
        .send({ action: 'rechazar' })
        .expect(200)
        .expect((r) => expect(r.body.status).toBe('EN_ATENCION'));
    });

    it('rechaza transición en solicitud CERRADA con 422', async () => {
      const id = await createRequest();

      await request(app.getHttpServer()).post(`/requests/${id}/transitions`).set(HEADERS_ANALISTA).send({ action: 'atender' });
      await request(app.getHttpServer()).post(`/requests/${id}/transitions`).set(HEADERS_ANALISTA).send({ action: 'resolver' });
      await request(app.getHttpServer()).post(`/requests/${id}/transitions`).set(HEADERS_FILIAL).send({ action: 'confirmar' });

      await request(app.getHttpServer())
        .post(`/requests/${id}/transitions`)
        .set(HEADERS_ANALISTA)
        .send({ action: 'atender' })
        .expect(422);
    });

    it('rechaza rol incorrecto con 422', async () => {
      const id = await createRequest();

      return request(app.getHttpServer())
        .post(`/requests/${id}/transitions`)
        .set(HEADERS_FILIAL)
        .send({ action: 'atender' })
        .expect(422);
    });

    it('rechaza acceso cruzado de tenant con 404 opaco', async () => {
      const id = await createRequest();

      return request(app.getHttpServer())
        .post(`/requests/${id}/transitions`)
        .set(HEADERS_OTHER_TENANT)
        .send({ action: 'atender' })
        .expect(404);
    });
  });
});
