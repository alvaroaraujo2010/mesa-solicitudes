# Mesa de solicitudes

Aplicación multi-tenant para que las filiales consulten y den seguimiento a sus solicitudes de servicio compartido.

## Estructura

```text
apps/api               Backend NestJS (Clean Architecture)
apps/web               Frontend Angular 20
infra                  AWS CDK
docker-compose.yml     Perfiles memory | mysql | dynamodb
scripts/               Utilidades locales (MySQL)
```

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

Si ya inicializaste el portable una vez:

```powershell
.\scripts\start-mysql-portable.ps1
```

Credenciales: `mesa` / `mesa_secret`, base `mesa_solicitudes`, puerto `3307`.

### Opción B — MySQL Server 8.0 de Windows (puerto 3306)

Usuario local típico: `administrador` en `127.0.0.1:3306`.

```powershell
# Inicializa esquema (ajusta password si aplica)
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u administrador -p < apps/api/scripts/init-mysql.sql
```

En `apps/api/.env`:

```env
PERSISTENCE_ADAPTER=mysql
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=administrador
MYSQL_PASSWORD=tu_password
MYSQL_DATABASE=mesa_solicitudes
```

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
# MySQL + API + Web
PERSISTENCE_ADAPTER=mysql docker compose --profile mysql up --build

# Memoria
PERSISTENCE_ADAPTER=memory docker compose --profile memory up --build

# DynamoDB Local
PERSISTENCE_ADAPTER=dynamodb docker compose --profile dynamodb up --build
```

Para DynamoDB Local, crear la tabla:

```bash
cd apps/api
npm run dynamodb:ensure
```

## Pruebas y calidad

```bash
cd apps/api && npm run lint && npm test && npm run test:e2e && npm run build
cd apps/web && npm run lint && npm run build
cd infra && npm install && npm run synth
```

CI: `.github/workflows/ci.yml`.

## API relevante

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Salud |
| GET | `/requests` | Listado (`status`, `q`, `page`, `pageSize`) |
| GET | `/requests/:id` | Detalle (404 opaco entre tenants) |
| POST | `/requests` | Crear (rol `filial`) |
| POST | `/requests/:id/transitions` | `atender` \| `resolver` \| `confirmar` \| `rechazar` |
| POST | `/seed` | Carga de volumen |

## Flujo de estados

`REGISTRADA` → `EN_ATENCION` → `RESUELTA` → `CERRADA`

Desde `RESUELTA`, la filial puede `rechazar` y vuelve a `EN_ATENCION`. `CERRADA` es inmutable. Solo la filial confirma el cierre.

## Fuera de alcance

- Proveedor de identidad real (OAuth/OIDC)
- Notificaciones por correo
- Panel dedicado de analista (transiciones disponibles por API)
- Despliegue real a AWS (IaC validada con `cdk synth`)
- Búsqueda full-text avanzada en DynamoDB

Ver `DECISIONS.md`.
