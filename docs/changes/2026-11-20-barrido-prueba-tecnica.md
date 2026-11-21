# Barrido final vs prueba técnica

Fecha: 2026-11-20

## Validaciones ejecutadas

| Chequeo | Resultado |
|---------|-----------|
| API unit (`npm test`) | 56/56 OK |
| API e2e (`npm run test:e2e`) | 16/16 OK |
| Web build (`npm run build`) | OK |
| CDK synth (`npm run synth` en `infra`) | OK |
| Repo público GitHub | `alvaroaraujo2010/mesa-solicitudes` |
| Menciones Summa/prueba en código/docs | Ninguna |

## Matriz de requisitos

| ID | Requisito | Estado | Evidencia |
|----|-----------|--------|-----------|
| P1-01 | Filial ve solo sus solicitudes con estado | Completo | Listado acotado por tenant; UI Angular |
| P1-02 | Filtrar por estado y buscar específica | Completo | `status`, `q`, paginación |
| P1-03 | Seed ~50k sin demora perceptible | Completo | `POST /seed`; índices MySQL/GSI Dynamo |
| P1-04 | Vacío / error claros en UI | Completo | estados empty/error/loading |
| P2-01 | Nueva → REGISTRADA | Completo | create + tests |
| P2-02 | Solo etapa siguiente | Completo | `RequestProcessPolicy` |
| P2-03 | Filial confirma cierre | Completo | acción `confirmar` |
| P2-04 | Rechazo → EN_ATENCION | Completo | acción `rechazar` |
| P2-05 | CERRADA inmutable | Completo | policy + tests |
| P2-06 | Inválido con mensaje; sin cambio | Completo | 422 + tests de persistencia |
| P2-07 | Prueba por regla | Completo | unit + e2e |
| P3-01 | No listar/ver/modificar otro tenant | Completo | unit + e2e |
| P3-02 | 404 opaco | Completo | get/transition |
| T-01 | Node+TS; memoria o DynamoDB | Completo (+ MySQL) | adapters |
| T-02 | Angular 20 | Completo | `apps/web` |
| T-03 | Identidad simulada | Completo | cabeceras + selector |
| T-04 | docker-compose API+DB+web | Completo | perfiles memory/mysql/dynamodb |
| T-05 | IaC validable sin deploy | Completo | CDK synth OK |
| T-06 | Lint + CI YAML | Parcial entrega | Archivo local `.github/workflows/ci.yml`; **no está en el remoto** |
| T-07 | README + DECISIONS | Completo | fuera de alcance documentado |

## Pendientes de entrega (no de funcionalidad)

1. Subir `.github/workflows/ci.yml` al repo público (antes falló el push por scope `workflow` del token).
2. Commit/push de cambios locales: UI de proceso, SweetAlert, `rootDir`, README.
3. Opcional: añadir `npm run test:e2e` al job de CI (hoy CI corre lint + unit + build).

## Nota de alcance

La prueba dice que el problema 2 no exige pantalla; la UI de transiciones y SweetAlert son refuerzo para la demo/sustención.
