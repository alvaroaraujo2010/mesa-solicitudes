# Mesa de solicitudes

Aplicación multi-tenant para que las filiales consulten, registren y den seguimiento a sus solicitudes de servicio compartido, respetando el proceso acordado.

## Estructura

```text
apps/api               Backend NestJS (Clean Architecture)
apps/api/scripts       Scripts de base de datos y seed
apps/web               Frontend Angular 20
infra                  AWS CDK (DynamoDB + API Fargate + web S3/CloudFront)
docker-compose.yml     Perfiles memory | mysql | dynamodb
.github/workflows      CI (lint, tests, build, cdk synth)
scripts/               Utilidades locales (MySQL portable, docs)
docs/                  Bitácora de cambios y sustentación
```

### Scripts de base de datos (`apps/api/scripts/`)

| Archivo | Base | Uso |
|---------|------|-----|
| `init-mysql.sql` | MySQL | Crea la BD, tabla `requests` e índices |
| `ensure-dynamodb-table.ts` | DynamoDB Local | Crea la tabla y GSI (`npm run dynamodb:ensure`) |
| `seed.ts` | Cualquier adapter | Carga de volumen (también vía `POST /seed`) |

## Requisitos

- Node.js 22+
- npm 10+
- MySQL 8 (local) **o** Docker Compose
- AWS CLI no es necesario para validar IaC (`cdk synth`)

## Persistencia (comentar / descomentar)

Copia y edita `apps/api/.env`:

```bash
cp apps/api/.env.example apps/api/.env
```

Deja activo **un solo** bloque:

```env
# --- memory ---
# PERSISTENCE_ADAPTER=memory

# --- mysql local ---
PERSISTENCE_ADAPTER=mysql
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3307
MYSQL_USER=mesa
MYSQL_PASSWORD=mesa_secret
MYSQL_DATABASE=mesa_solicitudes

# --- dynamodb local ---
# PERSISTENCE_ADAPTER=dynamodb
# DYNAMODB_TABLE_NAME=mesa-solicitudes
# DYNAMODB_REGION=us-east-1
# DYNAMODB_ENDPOINT=http://localhost:8000
# AWS_ACCESS_KEY_ID=local
# AWS_SECRET_ACCESS_KEY=local
```

## Arranque local con MySQL

### Opción A — MySQL portable (puerto 3307)

```powershell
.\scripts\start-mysql-portable.ps1
```

Credenciales: `mesa` / `mesa_secret`, base `mesa_solicitudes`, puerto `3307`.

### Opción B — MySQL Server 8.0 de Windows (puerto 3306)

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u administrador -p < apps/api/scripts/init-mysql.sql
```

En `apps/api/.env` usa `MYSQL_PORT=3306` y tus credenciales.

### API + Web

```bash
cd apps/api
npm install
npm run build
npm run start:dev

# otra terminal
cd apps/web
npm install
npm start
```

- API: http://localhost:3000
- Web: http://localhost:4200

Identidad simulada: el selector de sesión envía `X-Tenant-Id`, `X-User-Id` y `X-User-Role`.

## Datos de volumen (~50.000)

```bash
curl -X POST "http://localhost:3000/seed?tenantId=filial-cementos&count=50000"
```

Usa la sesión **Ana Pérez · Cementos** en la UI.

## Docker Compose (perfiles)

```bash
PERSISTENCE_ADAPTER=mysql docker compose --profile mysql up --build
PERSISTENCE_ADAPTER=memory docker compose --profile memory up --build
PERSISTENCE_ADAPTER=dynamodb docker compose --profile dynamodb up --build
```

Para DynamoDB Local, crear la tabla:

```bash
cd apps/api
npm run dynamodb:ensure
```

## Qué hace la UI

- **Consulta:** listado paginado, filtro por estado, búsqueda por ID/título, estados vacío/error/carga.
- **Proceso completo:** no es solo consulta.
  - Filial: registrar solicitud; si está `RESUELTA`, confirmar cierre o rechazar.
  - Analista: atender y marcar resuelta.
- **SweetAlert2:** diálogo al registrar y al cambiar de estado (éxito o error).
- Misma filial ≠ mismas acciones: en `REGISTRADA` la filial ve “Sin acción para este rol” porque quien debe actuar es el analista.

## Flujo de estados

`REGISTRADA` → `EN_ATENCION` → `RESUELTA` → `CERRADA`

Desde `RESUELTA`, la filial puede `rechazar` y vuelve a `EN_ATENCION`. `CERRADA` es inmutable. Solo la filial confirma el cierre.

## API relevante

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Salud |
| GET | `/requests` | Listado (`status`, `q`, `page`, `pageSize`) |
| GET | `/requests/:id` | Detalle (404 opaco entre tenants) |
| POST | `/requests` | Crear (rol `filial`) |
| POST | `/requests/:id/transitions` | `atender` \| `resolver` \| `confirmar` \| `rechazar` |
| POST | `/seed` | Carga de volumen |

## Pruebas y calidad

```bash
cd apps/api && npm run lint && npm test && npm run test:e2e && npm run build
cd apps/web && npm run lint && npm run build
cd infra && npm install && npm run synth
```

CI local: `.github/workflows/ci.yml` (lint API/web, tests unitarios API, build, `cdk synth`).

La explicación de infraestructura está en `docs/sustentacion/`.

## Cambios recientes (bitácora)

| Fecha | Cambio | Doc |
|-------|--------|-----|
| 2026-11-19 | Núcleo API/web/compose/CDK/CI | `docs/changes/2026-11-19-mesa-solicitudes-core.md` |
| 2026-11-19 | UI de proceso (crear + transiciones) | `docs/changes/2026-11-19-ui-proceso-completo.md` |
| 2026-11-20 | `rootDir` en tsconfig (TS 6) | `docs/changes/2026-11-20-tsconfig-rootdir.md` |
| 2026-11-20 | SweetAlert en registro y cambios de estado | `docs/changes/2026-11-20-sweetalert-registro.md` |
| 2026-11-20 | Barrido vs prueba técnica | `docs/changes/2026-11-20-barrido-prueba-tecnica.md` |
| 2026-11-20 | Actualización de documentación | `docs/changes/2026-11-20-docs-infra-actualizacion.md` |

## Fuera de alcance

- Proveedor de identidad real (OAuth/OIDC)
- Notificaciones por correo
- Despliegue real a AWS (IaC validada con `cdk synth`)
- Búsqueda full-text avanzada en DynamoDB

Ver `DECISIONS.md`.
