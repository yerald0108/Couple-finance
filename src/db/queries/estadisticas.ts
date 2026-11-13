import type { SQLiteDatabase } from 'expo-sqlite';
import { agregarGastos, type Estadisticas, type GastoEstadistica } from '../../utils/estadisticas';
import { rangoPeriodo, type Periodo, type RangoPeriodo } from '../../utils/fechas';

export interface DatosEstadisticas {
  rango: RangoPeriodo;
  stats: Estadisticas;
}

/** Gastos del período (todo lo que no es ingreso, incluidas las salidas de ahorro), con los datos de su sector. */
export async function getGastosPeriodo(
  db: SQLiteDatabase,
  rango: Pick<RangoPeriodo, 'desde' | 'hasta'>,
): Promise<GastoEstadistica[]> {
  return db.getAllAsync<GastoEstadistica>(
    `SELECT m.sector_id AS sector_id,
            s.nombre AS sector_nombre,
            s.tipo AS sector_tipo,
            s.color AS sector_color,
            m.forma AS forma,
            m.monto AS monto,
            m.fecha AS fecha
       FROM movimientos m
       JOIN sectores s ON s.id = m.sector_id
      WHERE m.deleted_at IS NULL AND m.tipo <> 'ingreso'
        AND m.fecha >= ? AND m.fecha < ?
      ORDER BY m.fecha ASC`,
    [rango.desde, rango.hasta],
  );
}

/**
 * Estadísticas de gastos de un período.
 * `desplazamiento`: 0 = el período actual, -1 = el anterior, etc.
 */
export async function cargarEstadisticas(
  db: SQLiteDatabase,
  periodo: Periodo,
  desplazamiento = 0,
  ahora: Date = new Date(),
): Promise<DatosEstadisticas> {
  const rango = rangoPeriodo(periodo, ahora, desplazamiento);
  const gastos = await getGastosPeriodo(db, rango);
  return { rango, stats: agregarGastos(gastos, rango.inicio, rango.fin) };
}