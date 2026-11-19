# Mesa de Solicitudes — API Backend (NestJS)

**Fecha:** 2026-11-19  
**Ruta:** `apps/api`

---

## Resumen

Se implementó la capa de backend completa para la Mesa de Solicitudes multi-tenant.  
Arquitectura limpia (Clean Architecture) con separación estricta por capas y principios SOLID.

---

## Estructura implementada

```
apps/api/src/
  domain/
    entities/        request.entity.ts
    enums/           request-status.enum.ts | transition-action.enum.ts | user-role.enum.ts
    errors/          domain.error.ts | invalid-transition.error.ts | request-not-found.error.ts | forbidden-operation.error.ts
    repositories/    request.repository.interface.ts
    services/        request-process.policy.ts
  application/
    dto/             create-request.dto.ts | list-requests-query.dto.ts | paginated-result.dto.ts | transition-request.dto.ts
    ports/           request-repository.port.ts
    use-cases/       create-request | get-request | list-requests | transition-request | seed
  infrastructure/
    config/          env.config.ts
    persistence/
      memory/        memory-request.repository.ts
      mysql/         mysql-request.repository.ts | mysql.provider.ts
      dynamodb/      dynamodb-request.repository.ts | dynamodb.provider.ts
      persistence.module.ts
  presentation/
    controllers/     requests.controller.ts | health.controller.ts | seed.controller.ts
    decorators/      tenant-context.decorator.ts
    filters/         domain-exception.filter.ts
    guards/          tenant-headers.guard.ts
  app.module.ts
  main.ts
```

---

## Reglas de negocio implementadas

### Ciclo de vida de una solicitud

| Acción     | Estado origen | Rol requerido | Estado destino |
|-----------|---------------|---------------|----------------|
| `atender` | REGISTRADA    | analista      | EN_ATENCION    |
| `resolver`| EN_ATENCION   | analista      | RESUELTA       |
| `confirmar`| RESUELTA     | filial        | CERRADA        |
| `rechazar` | RESUELTA     | filial        | EN_ATENCION    |

- Estado `CERRADA` es **inmutable**.
- Transiciones inválidas rechazadas con mensaje en español (HTTP 422).
- Solo las **filiales** pueden crear solicitudes (HTTP 403 en caso contrario).

### Multi-tenant

- Cabeceras requeridas: `X-Tenant-Id`, `X-User-Id`, `X-User-Role`.
- Aislamiento estricto por `tenantId` en todas las consultas.
- Acceso cruzado de tenant devuelve 404 opaco (no revela existencia).

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`  | `/health` | Estado de la API |
| `POST` | `/requests` | Crear solicitud (filial) |
| `GET`  | `/requests` | Listar (paginación, filtro, búsqueda) |
| `GET`  | `/requests/:id` | Obtener por id (tenant-scoped) |
| `POST` | `/requests/:id/transitions` | Cambiar estado |
| `POST` | `/seed` | Semilla de datos para pruebas de volumen |

---

## Adaptadores de persistencia

Seleccionables mediante `PERSISTENCE_ADAPTER=memory|mysql|dynamodb`.

| Adaptador | Implementación | Notas |
|-----------|---------------|-------|
| `memory`  | `Map<string, RequestEntity>` | Valor por defecto |
| `mysql`   | mysql2 pool + bulk INSERT de 1 000 filas | Índices en `(tenant_id, status)` y `(tenant_id, id)` |
| `dynamodb`| AWS SDK v3 DocumentClient | Soporte endpoint local; bulk write 25 items por batch |

Script de inicialización MySQL: `scripts/init-mysql.sql`

---

## Tests

```
test/unit/domain/request-process-policy.spec.ts       — política de transiciones
test/unit/application/create-request.use-case.spec.ts — creación + aislamiento
test/unit/application/get-request.use-case.spec.ts    — obtención + 404 opaco
test/unit/application/list-requests.use-case.spec.ts  — paginación + filtros
test/unit/application/transition-request.use-case.spec.ts — todas las transiciones
test/e2e/requests.e2e-spec.ts                         — flujo completo HTTP
```

**Resultado:** 5 suites · 56 tests · ✅ 56 pasados

Ejecutar con:
```bash
npm test          # unit tests
npm run test:e2e  # e2e tests (requiere adaptador memory)
```

---

## Configuración

Ver `.env.example` para los bloques comentados por adaptador.

Variables clave:

| Variable | Por defecto | Descripción |
|----------|-------------|-------------|
| `PORT` | `3000` | Puerto HTTP |
| `PERSISTENCE_ADAPTER` | `memory` | Adaptador activo |
| `MYSQL_HOST` | `localhost` | (solo mysql) |
| `DYNAMODB_ENDPOINT` | — | Endpoint local DynamoDB (opcional) |

---

## Decisiones de diseño

- **`crypto.randomUUID()`** nativo de Node.js para generación de IDs (sin dependencia externa).
- **`REQUEST_REPOSITORY_TOKEN`** como token Symbol para DI; implementación desacoplada del dominio.
- **`PersistenceModule.forRoot()`** como módulo dinámico que elige el adaptador en startup.
- **Guard `TenantHeadersGuard`** aplicado solo al `RequestsController`; seed y health no requieren cabeceras.
- **Filtro `DomainExceptionFilter`**: `RequestNotFoundError→404`, `InvalidTransitionError→422`, `ForbiddenOperationError→403`.
- Tests en modo **ESM** con `--experimental-vm-modules` por compatibilidad con NestJS (ESM-only en versión actual).
