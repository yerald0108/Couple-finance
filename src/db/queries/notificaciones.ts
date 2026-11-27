import type { SQLiteDatabase } from 'expo-sqlite';
import { getAjuste, setAjuste } from '../../sync/ajustes';
import { VENTANA_NUEVAS_DIAS, type DatosNotificacion } from '../../utils/notificaciones';

/**
 * Notificaciones de movimientos (sin tablas nuevas).
 *
 * "Nuevo" = un movimiento que registró TU PAREJA, que llegó a este teléfono después de la última vez que abriste
 * las notificaciones y que tiene menos de 7 días. "Después de" se mide con el `rowid` de SQLite: crece con
 * cada movimiento que entra a este teléfono (registrado aquí o bajado de la pareja), así que sirve para saber
 * qué llegó después aunque el otro teléfono lo registrara hace rato sin internet.
 * Lo que la pareja edita de un movimiento que ya tenías no cuenta como nuevo.
 */
const AJUSTE_VISTO = 'notif_visto_rowid';

export interface Notificacion extends DatosNotificacion {
  id: string;
  fecha: string;
  created_at: string;
  registrado_por: string | null;
  nuevo: boolean;
}

export interface ListaNotificaciones {
  items: Notificacion[];
  /** Cuántos movimientos nuevos de la pareja hay (todos, no solo los de la lista). */
  noLeidas: number;
  /** Último `rowid` que existía al leer: es hasta donde `marcarVistas` debe marcar (lo que llegue después sigue siendo nuevo). */
  hastaRowid: number;
}

interface FilaNotificacion extends DatosNotificacion {
  rowid: number;
  id: string;
  fecha: string;
  created_at: string;
  registrado_por: string | null;
}

/** Hasta qué `rowid` ya se vio. Si no hay marca (o la base se reinició y quedó por delante), se cuenta desde cero. */
async function leerVisto(db: SQLiteDatabase): Promise<number> {
  const guardado = Number(await getAjuste(db, AJUSTE_VISTO));
  if (!Number.isFinite(guardado) || guardado <= 0) return 0;
  const max = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(rowid) AS m FROM movimientos');
  return guardado > (max?.m ?? 0) ? 0 : guardado;
}

function desdeNuevas(ahora: Date): string {
  return new Date(ahora.getTime() - VENTANA_NUEVAS_DIAS * 24 * 3600 * 1000).toISOString();
}

/** Cuántos movimientos nuevos de la pareja hay. Sin cuenta (`yoId` null) siempre es 0. */
export async function contarNoLeidas(
  db: SQLiteDatabase,
  yoId: string | null,
  ahora: Date = new Date(),
): Promise<number> {
  if (yoId === null) return 0;
  const visto = await leerVisto(db);
  const fila = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM movimientos
      WHERE deleted_at IS NULL
        AND registrado_por IS NOT NULL AND registrado_por <> ?
        AND rowid > ? AND created_at >= ?`,
    [yoId, visto, desdeNuevas(ahora)],
  );
  return fila?.n ?? 0;
}

/** Los últimos movimientos de los dos (el más reciente primero), con los nuevos de la pareja marcados. */
export async function getNotificaciones(
  db: SQLiteDatabase,
  yoId: string | null,
  ahora: Date = new Date(),
  limite = 50,
): Promise<ListaNotificaciones> {
  const visto = await leerVisto(db);
  const desde = desdeNuevas(ahora);
  // Se lee ANTES que la lista: si algo llega justo en medio, queda sin marcar y se vuelve a avisar.
  const max = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(rowid) AS m FROM movimientos');
  const filas = await db.getAllAsync<FilaNotificacion>(
    `SELECT m.rowid AS rowid, m.id AS id, m.tipo AS tipo, m.monto AS monto, m.forma AS forma,
            m.concepto AS concepto, m.origen AS origen, m.motivo_ahorro AS motivo_ahorro,
            s.nombre AS sector_nombre, m.fecha AS fecha, m.created_at AS created_at,
            m.registrado_por AS registrado_por
       FROM movimientos m
       JOIN sectores s ON s.id = m.sector_id
      WHERE m.deleted_at IS NULL
      ORDER BY m.created_at DESC, m.rowid DESC
      LIMIT ?`,
    [limite],
  );

  const items = filas.map(({ rowid, ...resto }): Notificacion => ({
    ...resto,
    nuevo:
      yoId !== null &&
      resto.registrado_por !== null &&
      resto.registrado_por !== yoId &&
      rowid > visto &&
      resto.created_at >= desde,
  }));

  return { items, noLeidas: await contarNoLeidas(db, yoId, ahora), hastaRowid: max?.m ?? 0 };
}

/**
 * Marca como vistas las notificaciones hasta `hasta` (el `hastaRowid` de la lista que se mostró) o, si no se
 * indica, todas las que hay ahora. Nunca retrocede la marca.
 */
export async function marcarVistas(db: SQLiteDatabase, hasta?: number): Promise<void> {
  const max = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(rowid) AS m FROM movimientos');
  const destino = Math.min(hasta ?? Number.POSITIVE_INFINITY, max?.m ?? 0);
  const actual = await leerVisto(db);
  if (destino > actual) await setAjuste(db, AJUSTE_VISTO, String(destino));
}