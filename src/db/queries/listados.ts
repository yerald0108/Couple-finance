import type { SQLiteDatabase } from 'expo-sqlite';
import type { FormaDinero } from '../../types';
import type { Movimiento } from '../schema';

export interface RangoFechas {
  /** Inicio (incluido), ISO UTC. */
  desde: string;
  /** Fin (excluido), ISO UTC. */
  hasta: string;
}

export interface RepartoDetalle {
  sector_id: string;
  sector_nombre: string;
  monto: number;
}

export interface IngresoMes {
  movimiento: Movimiento;
  repartos: RepartoDetalle[];
}

/** Ingresos del período (más nuevos primero), cada uno con su reparto por sector. */
export async function getIngresosMes(db: SQLiteDatabase, rango: RangoFechas): Promise<IngresoMes[]> {
  const movimientos = await db.getAllAsync<Movimiento>(
    `SELECT * FROM movimientos
      WHERE tipo = 'ingreso' AND deleted_at IS NULL AND fecha >= ? AND fecha < ?
      ORDER BY fecha DESC`,
    [rango.desde, rango.hasta],
  );

  const repartos = await db.getAllAsync<RepartoDetalle & { movimiento_id: string }>(
    `SELECT r.movimiento_id AS movimiento_id,
            r.sector_id AS sector_id,
            s.nombre AS sector_nombre,
            r.monto AS monto
       FROM repartos r
       JOIN movimientos m ON m.id = r.movimiento_id
       JOIN sectores s ON s.id = r.sector_id
      WHERE r.deleted_at IS NULL AND m.deleted_at IS NULL
        AND m.tipo = 'ingreso' AND m.fecha >= ? AND m.fecha < ?
      ORDER BY s.orden ASC, s.created_at ASC`,
    [rango.desde, rango.hasta],
  );

  const porMovimiento = new Map<string, RepartoDetalle[]>();
  for (const r of repartos) {
    const lista = porMovimiento.get(r.movimiento_id) ?? [];
    lista.push({ sector_id: r.sector_id, sector_nombre: r.sector_nombre, monto: r.monto });
    porMovimiento.set(r.movimiento_id, lista);
  }

  return movimientos.map((movimiento) => ({
    movimiento,
    repartos: porMovimiento.get(movimiento.id) ?? [],
  }));
}

/** Gastos de un sector en el período (más nuevos primero). */
export async function getGastosSector(
  db: SQLiteDatabase,
  sectorId: string,
  rango: RangoFechas,
): Promise<Movimiento[]> {
  return db.getAllAsync<Movimiento>(
    `SELECT * FROM movimientos
      WHERE sector_id = ? AND tipo <> 'ingreso' AND deleted_at IS NULL
        AND fecha >= ? AND fecha < ?
      ORDER BY fecha DESC`,
    [sectorId, rango.desde, rango.hasta],
  );
}

export interface HistorialAhorroItem {
  id: string;
  /** entrada = dinero que se repartió a Ahorro; salida = retiro con motivo. */
  clase: 'entrada' | 'salida';
  fecha: string;
  monto: number;
  forma: FormaDinero;
  /** Origen del ingreso (entradas) o motivo (salidas). */
  detalle: string | null;
}

/** Historial de entradas y salidas de Ahorro (más nuevos primero). Devuelve hasta `limite` y avisa si hay más. */
export async function getHistorialAhorro(
  db: SQLiteDatabase,
  sectorId: string,
  limite = 200,
): Promise<{ items: HistorialAhorroItem[]; hayMas: boolean }> {
  const filas = await db.getAllAsync<HistorialAhorroItem>(
    `SELECT r.id AS id, 'entrada' AS clase, m.fecha AS fecha, r.monto AS monto,
            m.forma AS forma, m.origen AS detalle
       FROM repartos r
       JOIN movimientos m ON m.id = r.movimiento_id
      WHERE r.sector_id = ? AND r.deleted_at IS NULL AND m.deleted_at IS NULL
     UNION ALL
     SELECT m.id AS id, 'salida' AS clase, m.fecha AS fecha, m.monto AS monto,
            m.forma AS forma, m.motivo_ahorro AS detalle
       FROM movimientos m
      WHERE m.sector_id = ? AND m.es_salida_ahorro = 1 AND m.deleted_at IS NULL
      ORDER BY fecha DESC
      LIMIT ?`,
    [sectorId, sectorId, limite + 1],
  );

  return { items: filas.slice(0, limite), hayMas: filas.length > limite };
}