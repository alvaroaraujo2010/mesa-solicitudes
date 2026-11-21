# Fix `rootDir` en tsconfig Angular

Fecha: 2026-11-20

## Problema

El language service de TypeScript reportaba en `tsconfig.app.json` que el directorio fuente común es `./src` y que `rootDir` debe declararse de forma explícita (migración TS 6).

## Cambio

- `apps/web/tsconfig.app.json`: `"rootDir": "./src"`
- `apps/web/tsconfig.spec.json`: `"rootDir": "./src"` (mismo criterio)

## Validación

- El diagnóstico de `rootDir` desaparece tras recargar el TS server / ventana.
- `npm run build` en `apps/web` sigue siendo el chequeo de compilación del proyecto.
