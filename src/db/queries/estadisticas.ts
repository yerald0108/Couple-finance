import type { SQLiteDatabase } from 'expo-sqlite';
import {
  analizarPeriodo,
  type AnalisisPeriodo,
  type RepartoPeriodo,
} from '../../utils/analisis';
import { agregarGastos, type Estadisticas, type GastoEstadistica } from '../../utils/estadisticas';
import {
  rangoComparable,
  rangoPeriodo,
  type Periodo,
  type RangoComparable,
  type RangoPeriodo,
} from '../../utils/fechas';
import { getTotalIngresosPeriodo } from './listados';

export interface DatosEstadisticas {
  rango: RangoPeriodo;
  /** Con qué período se compara (el anterior, o el mismo tramo de él). */
  comparable: RangoComparable;
  /** Los gastos del período ya sumados por forma, sector y día. */
  stats: Estadisticas;
  /** Resumen, comparación, evolución, detalle, mensajes, estimación y uso por sector. */
  analisis: AnalisisPeriodo;
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
            m.fecha AS fecha,
            m.concepto AS concepto,
            m.motivo_ahorro AS motivo_ahorro
       FROM movimientos m
       JOIN sectores s ON s.id = m.sector_id
      WHERE m.deleted_at IS NULL AND m.tipo <> 'ingreso'
        AND m.fecha >= ? AND m.fecha < ?
      ORDER BY m.fecha ASC`,
    [rango.desde, rango.hasta],
  );
}

/** Lo que los ingresos del período repartieron a cada sector (pesos y USD por separado). */
export async function getRepartosPeriodo(
  db: SQLiteDatabase,
  rango: Pick<RangoPeriodo, 'desde' | 'hasta'>,
): Promise<RepartoPeriodo[]> {
  return db.getAllAsync<RepartoPeriodo>(
    `SELECT r.sector_id AS sector_id,
            s.nombre AS sector_nombre,
            s.tipo AS sector_tipo,
            s.color AS sector_color,
            ROUND(COALESCE(SUM(CASE WHEN m.forma <> 'usd' THEN r.monto END), 0), 2) AS cup,
            ROUND(COALESCE(SUM(CASE WHEN m.forma = 'usd' THEN r.monto END), 0), 2) AS usd
       FROM repartos r
       JOIN movimientos m ON m.id = r.movimiento_id
       JOIN sectores s ON s.id = r.sector_id
      WHERE r.deleted_at IS NULL AND m.deleted_at IS NULL
        AND m.tipo = 'ingreso' AND m.fecha >= ? AND m.fecha < ?
      GROUP BY r.sector_id, s.nombre, s.tipo, s.color`,
    [rango.desde, rango.hasta],
  );
}

/**
 * Estadísticas y análisis de un período.
 * `desplazamiento`: 0 = el período actual, -1 = el anterior, etc.
 */
export async function cargarEstadisticas(
  db: SQLiteDatabase,
  periodo: Periodo,
  desplazamiento = 0,
  ahora: Date = new Date(),
): Promise<DatosEstadisticas> {
  const rango = rangoPeriodo(periodo, ahora, desplazamiento);
  const comparable = rangoComparable(periodo, ahora, desplazamiento);

  const gastos = await getGastosPeriodo(db, rango);
  const gastosAnteriores = await getGastosPeriodo(db, comparable);
  const ingresos = await getTotalIngresosPeriodo(db, rango);
  const ingresosAnteriores = await getTotalIngresosPeriodo(db, comparable);
  const repartos = await getRepartosPeriodo(db, rango);

  const stats = agregarGastos(gastos, rango.inicio, rango.fin);
  const analisis = analizarPeriodo(
    {
      periodo,
      ahora,
      desplazamiento,
      inicio: rango.inicio,
      fin: rango.fin,
      gastos,
      ingresos,
      anterior: {
        inicio: comparable.inicio,
        fin: comparable.fin,
        gastos: gastosAnteriores,
        ingresos: ingresosAnteriores,
      },
      repartos,
    },
    stats,
  );

  return { rango, comparable, stats, analisis };
}