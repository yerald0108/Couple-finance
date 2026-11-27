import type { SQLiteDatabase } from 'expo-sqlite';
import { mesDeIso, rangoDeMes, type FiltroTipo, type MesFiltro } from '../../utils/historial';
import type { DatosNotificacion } from '../../utils/notificaciones';

/** Un movimiento del historial: lo que hace falta para dibujar su fila y abrir su detalle. */
export interface MovimientoHistorial extends DatosNotificacion {
  id: string;
  fecha: string;
  created_at: string;
  registrado_por: string | null;
}

export interface FiltroHistorial {
  tipo: FiltroTipo;
  /** null = todos los meses. */
  mes: MesFiltro | null;
}

export interface ListaHistorial {
  /** Los más nuevos primero. Como mucho `limite`. */
  items: MovimientoHistorial[];
  /** true si hay más movimientos con este filtro que los que se leyeron. */
  hayMas: boolean;
  /** El mes del movimiento más antiguo que existe (sin filtros), o null si no hay ninguno. Es hasta donde se puede retroceder. */
  primerMes: MesFiltro | null;
}

/**
 * Los movimientos de los dos, de todos los meses, más nuevos primero, con el filtro de tipo y de mes aplicado.
 *
 * - "Gastos" incluye todo lo que no es ingreso: gastos de cualquier sector y retiros de ahorro.
 * - Se leen los primeros `limite`; para ver más se vuelve a pedir con un límite mayor (así la lista nunca
 *   repite ni se salta filas, aunque llegue algo de la pareja entre una lectura y otra).
 * - El orden `fecha DESC, rowid DESC` lo cubre el índice por fecha, así que leer 50 filas cuesta lo mismo con un mes
 *   de datos que con cinco años.
 */
export async function getHistorial(
  db: SQLiteDatabase,
  filtro: FiltroHistorial,
  limite: number,
): Promise<ListaHistorial> {
  const condiciones = ['m.deleted_at IS NULL'];
  const parametros: (string | number)[] = [];

  if (filtro.mes) {
    const { desde, hasta } = rangoDeMes(filtro.mes);
    condiciones.push('m.fecha >= ? AND m.fecha < ?');
    parametros.push(desde, hasta);
  }
  if (filtro.tipo === 'ingresos') condiciones.push(`m.tipo = 'ingreso'`);
  if (filtro.tipo === 'gastos') condiciones.push(`m.tipo <> 'ingreso'`);

  // Se pide una fila de más solo para saber si queda algo por leer.
  const filas = await db.getAllAsync<MovimientoHistorial>(
    `SELECT m.id AS id, m.tipo AS tipo, m.monto AS monto, m.forma AS forma,
            m.concepto AS concepto, m.origen AS origen, m.motivo_ahorro AS motivo_ahorro,
            s.nombre AS sector_nombre,
            m.fecha AS fecha, m.created_at AS created_at, m.registrado_por AS registrado_por
       FROM movimientos m
       JOIN sectores s ON s.id = m.sector_id
      WHERE ${condiciones.join(' AND ')}
      ORDER BY m.fecha DESC, m.rowid DESC
      LIMIT ?`,
    [...parametros, limite + 1],
  );

  const primero = await db.getFirstAsync<{ fecha: string | null }>(
    'SELECT MIN(fecha) AS fecha FROM movimientos WHERE deleted_at IS NULL',
  );

  return {
    items: filas.slice(0, limite),
    hayMas: filas.length > limite,
    primerMes: primero?.fecha ? mesDeIso(primero.fecha) : null,
  };
}