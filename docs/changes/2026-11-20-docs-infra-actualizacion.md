# Actualización de documentación

Fecha: 2026-11-20

## Motivo

Alinear README, DECISIONS y docs de sustentación con los cambios de UI (proceso + SweetAlert). La explicación de infraestructura queda **solo** en los `.docx` de sustentación.

## Documentos actualizados

| Archivo | Qué se añadió / ajustó |
|---------|------------------------|
| `README.md` | UI completa, SweetAlert, bitácora; sin detalle de infra |
| `DECISIONS.md` | UI de proceso + SweetAlert; puntero a sustentación para infra |
| `infra/README.md` | Solo comando `synth` + remisión a sustentación |
| `docs/sustentacion/*.docx` | Explicación de infra, proceso UI, SweetAlert y demo |
| `scripts/generate-sustentacion-docs.py` | Fuente de los .docx |

## Ajuste posterior

- README: tabla explícita de scripts en `apps/api/scripts/` (`init-mysql.sql`, `ensure-dynamodb-table.ts`, `seed.ts`).

## Validación

- Script de sustentación regenerado sin errores.
