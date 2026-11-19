-- ============================================================
-- Inicialización de la base de datos para Mesa de Solicitudes
-- ============================================================

CREATE DATABASE IF NOT EXISTS mesa_solicitudes
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mesa_solicitudes;

CREATE TABLE IF NOT EXISTS requests (
  id          VARCHAR(36)   NOT NULL,
  tenant_id   VARCHAR(255)  NOT NULL,
  title       VARCHAR(500)  NOT NULL,
  description TEXT          NOT NULL,
  status      ENUM(
    'REGISTRADA',
    'EN_ATENCION',
    'RESUELTA',
    'CERRADA'
  )                         NOT NULL DEFAULT 'REGISTRADA',
  created_by  VARCHAR(255)  NOT NULL,
  created_at  DATETIME(3)   NOT NULL,
  updated_at  DATETIME(3)   NOT NULL,
  PRIMARY KEY (id),
  -- Índice compuesto para listados filtrados por estado dentro de un tenant
  INDEX idx_tenant_status  (tenant_id, status),
  -- Índice compuesto para lookups por id dentro de un tenant
  INDEX idx_tenant_id      (tenant_id, id),
  -- Índice para ordenamiento y paginación por fecha de creación
  INDEX idx_tenant_created (tenant_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
