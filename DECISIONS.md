# Decisiones de diseño

## Modelo de datos

**Entidad `Request`**

| Campo | Tipo | Notas |
|-------|------|--------|
| id | UUID | Identificador de solicitud |
| tenantId | string | Filial propietaria |
| title | string | Hasta 500 chars |
| description | text | Detalle |
| status | enum | `REGISTRADA`, `EN_ATENCION`, `RESUELTA`, `CERRADA` |
| createdBy | string | Usuario creador |
| createdAt / updatedAt | datetime | Auditoría básica |

**MySQL:** PK `(id)`; índices `(tenant_id, status)`, `(tenant_id, id)`, `(tenant_id, created_at)` para listados filtrados y paginación con ~50k filas por tenant.

**DynamoDB:** PK `pk=tenantId`, SK `sk=id`. GSI `gsi-tenant-status` (`pk`, `status`) y `gsi-tenant-created` (`pk`, `createdAt`). El aislamiento queda en la clave de partición.

**Memoria:** `Map` indexado por `id`, filtrado por `tenantId` en consulta (útil para demos y tests).

## Problema 1 — Visibilidad del estado

Pantalla Angular con listado paginado, filtro por estado y búsqueda por id/título. Backend siempre acota por tenant. Seed `POST /seed` genera 50k registros. Se priorizó paginación + índices frente a cargar el dataset completo en cliente.

*Descartado:* infinite scroll sin total — dificulta validar volumen y “encontrar una solicitud específica”.

## Problema 2 — Proceso acordado

Máquina de estados en dominio (`RequestProcessPolicy`), invocada solo desde el caso de uso de transición. Roles: analista (`atender`, `resolver`); filial (`confirmar`, `rechazar`). Intentos inválidos → `422` con mensaje claro; la entidad no se persiste si falla la regla. Cubierto con pruebas unitarias por criterio.

*Descartado:* estados libres en el controlador — rompería la invariante del proceso.

## Problema 3 — Confidencialidad multi-tenant

Toda lectura/escritura exige `tenantId` del contexto (cabeceras simuladas). `findById(id, tenantId)` no distingue “no existe” vs “otro tenant” → mismo `404`. Pruebas de aislamiento en get/transition/list.

*Descartado:* filtrar solo en el frontend — inseguro ante llamadas directas a la API.

## Arquitectura y stack

- **Clean Architecture + SOLID** en NestJS: dominio sin dependencias de Nest; puertos/adapters para persistencia (`memory` \| `mysql` \| `dynamodb`).
- **Angular 20** standalone para la consulta de la filial.
- **CDK** modela DynamoDB, API Fargate y frontend S3/CloudFront; se valida con `cdk synth` sin cuenta.
- Identidad simulada por cabeceras (sin IdP) para acotar alcance a los tres problemas de negocio.
