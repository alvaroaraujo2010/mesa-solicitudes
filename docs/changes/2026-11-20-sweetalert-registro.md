# SweetAlert al registrar solicitud

Fecha: 2026-11-20

## Objetivo

Mostrar un diálogo SweetAlert2 cuando la filial registra una solicitud (éxito, validación o error de API).

## Cambios

- Dependencia `sweetalert2` en `apps/web`.
- Estilos globales: import en `src/styles.scss`.
- `createRequest()` en `request-list.ts` usa `Swal.fire` en éxito, datos incompletos y fallo de API.
- `runTransition()` usa el mismo patrón en éxito y error (atender, resolver, confirmar, rechazar).

## Validación

- `npm run build` en `apps/web`.
- Flujo manual: sesión filial → Registrar solicitud → alerta de éxito.
- Flujo manual: analista/filial → transición de estado → alerta de éxito o error.
