# 2026-11-19 — Núcleo Mesa de solicitudes

## Qué se hizo

- Backend NestJS con Clean Architecture, reglas de proceso, aislamiento multi-tenant y adapters `memory` | `mysql` | `dynamodb`.
- Frontend Angular 20 con listado, filtros, paginación, estados vacíos/error y sesión simulada.
- Docker Compose por perfiles, CDK (`cdk synth`), CI GitHub Actions, README y DECISIONS.
- MySQL local validado en MySQL80 (`127.0.0.1:3306`) y también portable (`3307`) como alternativa.
- Scripts `scripts/start-mysql-portable.ps1` y `scripts/setup-mysql-local.ps1`.

## Validación ejecutada

| Chequeo | Resultado |
|---------|-----------|
| Unit tests API | 56 passed |
| E2E API | 16 passed |
| Build web | OK |
| `cdk synth` | OK |
| Adapter mysql create/transition/isolation | OK |
| Seed 50k mysql | ~10 s |
| Listado filtrado mysql | ~16–80 ms |
| UI filtro + cambio de tenant | OK |

## Cómo correr

Ver README raíz. Por defecto local: MySQL portable 3307 + `PERSISTENCE_ADAPTER=mysql`.
