# UI de proceso completo (crear + transiciones)

Fecha: 2026-11-19

## Objetivo

Completar la interfaz Angular para que cubra el proceso normal de la mesa de solicitudes, no solo consulta: registrar, atender, resolver, confirmar y rechazar.

## Cambios

- Formulario de alta visible solo con sesión de filial (`title` + `description` → `POST /requests`).
- Acciones por fila según estado y rol:
  - Analista: `atender` (REGISTRADA → EN_ATENCION), `resolver` (EN_ATENCION → RESUELTA).
  - Filial: `confirmar` / `rechazar` (RESUELTA → CERRADA / EN_ATENCION).
- Feedback de éxito/error y bloqueo de controles mientras corre una acción.
- Estilos para compositor, flash messages y botones de transición.

## Archivos

- `apps/web/src/app/core/models/request.model.ts` — `ACTION_LABELS`, `availableActions`
- `apps/web/src/app/core/services/requests-api.service.ts` — `create`, `transition`
- `apps/web/src/app/features/requests/request-list/request-list.ts|html|scss`

## Validación

- `npm run build` en `apps/web`: OK (bundle generado en `dist/web`).
- Flujo manual: filial → registrar → analista → atender/resolver → filial → confirmar/rechazar.
