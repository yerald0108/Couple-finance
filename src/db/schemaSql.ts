/**
 * SQL puro de la base de datos local (versión 1).
 * No importa nada de Expo a propósito: así el mismo SQL se puede probar fuera del teléfono.
 *
 * Decisiones del modelo:
 * - IDs TEXT (UUID generado en el dispositivo) -> listos para sincronizar en la Fase 8.
 * - Fechas en ISO 8601 UTC (ej. 2026-11-12T12:30:00.000Z): se comparan bien como texto
 *   y sirven para "last-write-wins" por updated_at. La pantalla las muestra en hora local.
 * - deleted_at = borrado lógico (soft delete), preparado para la Fase 8.
 * - registrado_por (Fase 7) ya existe en movimientos, nulo hasta entonces.
 * - Los sectores base y las 3 cuentas usan IDs fijos (no aleatorios): así dos teléfonos
 *   que crean la base por separado tienen los MISMOS registros base y la Fase 8 no los duplica.
 */

export const SCHEMA_V1 = `
CREATE TABLE sectores (
  id          TEXT PRIMARY KEY NOT NULL,
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  tipo        TEXT NOT NULL CHECK (tipo IN ('ingresos','gastos_fijos','gustos','ahorro','personalizado')),
  icono       TEXT,
  color       TEXT,
  activo      INTEGER NOT NULL DEFAULT 1,
  orden       INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT
);

CREATE TABLE cuentas (
  id          TEXT PRIMARY KEY NOT NULL,
  nombre      TEXT NOT NULL,
  tipo        TEXT NOT NULL UNIQUE CHECK (tipo IN ('efectivo','transferencia','usd')),
  moneda      TEXT NOT NULL DEFAULT 'CUP' CHECK (moneda IN ('CUP','USD')),
  saldo       REAL NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE ajustes (
  clave       TEXT PRIMARY KEY NOT NULL,
  valor       TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE movimientos (
  id               TEXT PRIMARY KEY NOT NULL,
  tipo             TEXT NOT NULL,
  monto            REAL NOT NULL CHECK (monto > 0),
  forma            TEXT NOT NULL CHECK (forma IN ('efectivo','transferencia','usd')),
  concepto         TEXT,
  origen           TEXT,
  sector_id        TEXT NOT NULL REFERENCES sectores(id),
  motivo_ahorro    TEXT,
  es_salida_ahorro INTEGER NOT NULL DEFAULT 0,
  fecha            TEXT NOT NULL,
  registrado_por   TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  deleted_at       TEXT
);

CREATE TABLE repartos (
  id             TEXT PRIMARY KEY NOT NULL,
  movimiento_id  TEXT NOT NULL REFERENCES movimientos(id),
  sector_id      TEXT NOT NULL REFERENCES sectores(id),
  monto          REAL NOT NULL CHECK (monto > 0),
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  deleted_at     TEXT
);

CREATE INDEX idx_movimientos_fecha ON movimientos(fecha);
CREATE INDEX idx_movimientos_sector ON movimientos(sector_id);
CREATE INDEX idx_repartos_movimiento ON repartos(movimiento_id);
CREATE INDEX idx_repartos_sector ON repartos(sector_id);
`;

export type SqlValue = string | number | null;

export interface SeedStatement {
  sql: string;
  params: SqlValue[];
}

/** Datos iniciales: los 4 sectores base y las 3 cuentas (una por forma de dinero). */
export function seedV1(now: string): SeedStatement[] {
  const sector = (
    id: string,
    nombre: string,
    descripcion: string,
    tipo: string,
    orden: number,
  ): SeedStatement => ({
    // icono y color quedan en NULL: la interfaz los toma del tema según el tipo.
    sql: `INSERT OR IGNORE INTO sectores
            (id, nombre, descripcion, tipo, icono, color, activo, orden, created_at, updated_at)
          VALUES (?, ?, ?, ?, NULL, NULL, 1, ?, ?, ?)`,
    params: [id, nombre, descripcion, tipo, orden, now, now],
  });

  const cuenta = (
    id: string,
    nombre: string,
    tipo: string,
    moneda: string,
  ): SeedStatement => ({
    sql: `INSERT OR IGNORE INTO cuentas
            (id, nombre, tipo, moneda, saldo, created_at, updated_at)
          VALUES (?, ?, ?, ?, 0, ?, ?)`,
    params: [id, nombre, tipo, moneda, now, now],
  });

  return [
    sector('sector_ingresos', 'Ingresos', 'Dinero que entra', 'ingresos', 0),
    sector('sector_gastos_fijos', 'Gastos fijos', 'Comida, aseo y gastos necesarios', 'gastos_fijos', 1),
    sector('sector_gustos', 'Gustos', 'Compras por placer', 'gustos', 2),
    sector('sector_ahorro', 'Ahorro', 'Dinero guardado para emergencias', 'ahorro', 3),
    cuenta('cuenta_efectivo', 'Efectivo', 'efectivo', 'CUP'),
    cuenta('cuenta_transferencia', 'Transferencia', 'transferencia', 'CUP'),
    cuenta('cuenta_usd', 'USD', 'usd', 'USD'),
  ];
}