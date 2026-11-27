import type { SQLiteDatabase } from 'expo-sqlite';
import { getAjuste, setAjuste } from '../../sync/ajustes';
import type { Montos } from '../../utils/analisis';
import {
  claveMes,
  claveMesAnterior,
  cierreYaVisto,
  construirCierre,
  desplazamientoDeClave,
  leerClaveMes,
  type CierreMes,
} from '../../utils/cierreMes';
import { rangoPeriodo } from '../../utils/fechas';
import { cargarEstadisticas } from './estadisticas';

/** Última clave de mes ("2026-10") cuyo cierre ya se vio en ESTE teléfono (tabla `ajustes`, no se sincroniza). */
export const AJUSTE_CIERRE_VISTO = 'cierre_mes_visto';

/**
 * Saldo de cada sector justo antes de `hasta` (ISO UTC): lo repartido menos lo gastado hasta ese momento.
 * Es el mismo cálculo de `getSaldosSectores`, pero "a una fecha". Los sectores sin movimientos no aparecen (saldo 0).
 */
export async function getSaldosSectoresAl(
  db: SQLiteDatabase,
  hasta: string,
): Promise<Map<string, Montos>> {
  const filas = await db.getAllAsync<{ sector_id: string; cup: number; usd: number }>(
    `SELECT x.sector_id AS sector_id,
            ROUND(COALESCE(SUM(CASE WHEN x.moneda = 'CUP' THEN x.monto END), 0), 2) AS cup,
            ROUND(COALESCE(SUM(CASE WHEN x.moneda = 'USD' THEN x.monto END), 0), 2) AS usd
       FROM (
         SELECT r.sector_id AS sector_id,
                CASE WHEN m.forma = 'usd' THEN 'USD' ELSE 'CUP' END AS moneda,
                r.monto AS monto
           FROM repartos r
           JOIN movimientos m ON m.id = r.movimiento_id
          WHERE r.deleted_at IS NULL AND m.deleted_at IS NULL AND m.fecha < ?
         UNION ALL
         SELECT m.sector_id,
                CASE WHEN m.forma = 'usd' THEN 'USD' ELSE 'CUP' END,
                -m.monto
           FROM movimientos m
          WHERE m.deleted_at IS NULL AND m.tipo <> 'ingreso' AND m.fecha < ?
       ) x
      GROUP BY x.sector_id`,
    [hasta, hasta],
  );
  return new Map(filas.map((f) => [f.sector_id, { cup: f.cup, usd: f.usd }]));
}

/** Fecha (ISO UTC) del movimiento más antiguo, o null si no hay ninguno. */
export async function getFechaPrimerMovimiento(db: SQLiteDatabase): Promise<string | null> {
  const fila = await db.getFirstAsync<{ f: string | null }>(
    'SELECT MIN(fecha) AS f FROM movimientos WHERE deleted_at IS NULL',
  );
  return fila?.f ?? null;
}

/**
 * El cierre de un mes ya terminado. `clave` = "2026-10". Devuelve null si la clave no es válida o si ese mes
 * todavía no terminó (el mes actual no se cierra hasta que acaba).
 */
export async function cargarCierreMes(
  db: SQLiteDatabase,
  clave: string,
  ahora: Date = new Date(),
): Promise<CierreMes | null> {
  const desplazamiento = desplazamientoDeClave(clave, ahora);
  if (desplazamiento === null) return null;

  const datos = await cargarEstadisticas(db, 'mes', desplazamiento, ahora);
  const saldosFinales = await getSaldosSectoresAl(db, datos.rango.hasta);
  const primero = await getFechaPrimerMovimiento(db);

  return construirCierre({
    clave,
    stats: datos.stats,
    analisis: datos.analisis,
    etiquetaAnterior: datos.comparable.etiqueta,
    saldosFinales,
    hayMesAnterior: primero !== null && primero < datos.rango.desde,
  });
}

export interface CierrePendiente {
  clave: string;
  /** "Octubre 2026" */
  etiqueta: string;
}

/**
 * El cierre que toca avisar: el del mes que acaba de terminar, si hubo movimientos y todavía no se vio en este
 * teléfono. Si pasaron varios meses sin abrirlo, solo se avisa del último (los anteriores se ven con las flechas).
 */
export async function getCierrePendiente(
  db: SQLiteDatabase,
  ahora: Date = new Date(),
): Promise<CierrePendiente | null> {
  const clave = claveMesAnterior(ahora);
  if (cierreYaVisto(await getAjuste(db, AJUSTE_CIERRE_VISTO), clave, ahora)) return null;

  const rango = rangoPeriodo('mes', ahora, -1);
  const fila = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM movimientos
      WHERE deleted_at IS NULL AND fecha >= ? AND fecha < ?`,
    [rango.desde, rango.hasta],
  );
  if ((fila?.n ?? 0) === 0) return null;
  return { clave, etiqueta: rango.etiqueta };
}

/**
 * Marca como visto el cierre de `clave` (y de todos los meses anteriores). No retrocede, salvo que lo guardado
 * sea ilegible o del futuro (reloj mal puesto): eso se sobrescribe.
 */
export async function marcarCierreVisto(
  db: SQLiteDatabase,
  clave: string,
  ahora: Date = new Date(),
): Promise<void> {
  if (leerClaveMes(clave) === null) return;
  const actual = await getAjuste(db, AJUSTE_CIERRE_VISTO);
  if (actual !== null && leerClaveMes(actual) !== null && actual <= claveMes(ahora) && actual >= clave) return;
  await setAjuste(db, AJUSTE_CIERRE_VISTO, clave);
}