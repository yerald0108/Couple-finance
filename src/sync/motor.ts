/**
 * Motor de sincronización entre teléfonos (Fase 8B).
 *
 * La base local es SIEMPRE la fuente de lo que ves: todo se guarda primero aquí y la pantalla se actualiza
 * al instante. Este motor, cuando hay internet, hace dos cosas:
 *   1) SUBIR (push): manda a Supabase los registros de la cola `sync_cola` (los que cambiaron aquí).
 *   2) BAJAR (pull): pide a Supabase lo que cambió allá (por orden de llegada) y lo aplica aquí.
 * Si dos teléfonos cambiaron el mismo registro, gana el `updated_at` más reciente (last-write-wins).
 * Los saldos de las cuentas NO se sincronizan: se recalculan sumando los movimientos.
 *
 * Todo es idempotente: repetir una subida o una bajada no duplica nada (los ids los crea cada teléfono).
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import { llamarRpc, type ClienteCuentas } from '../lib/cuentaService';
import { delAjuste, getAjuste, setAjuste } from './ajustes';
import {
  ORDEN_TABLAS,
  aFilaLocal,
  aIsoLocal,
  filasIguales,
  restarMs,
  sqlUpsert,
  TABLAS,
  type FilaLocal,
  type TablaSync,
} from './tablas';

export type ClienteSync = Pick<ClienteCuentas, 'rpc'>;

/** Quién es esta sesión: la cuenta, su pareja y las cuentas que forman la pareja. */
export interface SesionSync {
  usuarioId: string;
  parejaId: string;
  miembrosIds: string[];
}

export interface ResultadoSync {
  /** Registros subidos a Supabase. */
  subidos: number;
  /** Registros de la pareja que se guardaron/actualizaron aquí. */
  bajados: number;
  /** Cambios locales que siguen sin subirse. */
  pendientes: number;
}

export type ResultadoActivacion =
  | { tipo: 'listo' }
  /** Este teléfono y la pareja ya tienen movimientos: hay que elegir cómo unirlos. */
  | { tipo: 'decidir'; locales: number; remotos: number };

export type ModoUnion = 'unir' | 'empezar';

// Claves de ajustes
const K_ACTIVO = 'sync_activo';
const K_USUARIO = 'sync_usuario_id';
const K_PAREJA = 'sync_pareja_id';
const K_ULTIMA = 'sync_ultima';
const kCursor = (t: TablaSync) => `sync_cursor_${t}`;

/** Tamaños de lote: cuántos registros por llamada. */
const LOTE_SUBIDA = 300;
const LOTE_BAJADA = 500;
/** Al bajar se relee un poco hacia atrás: si dos envíos se cruzaron en el servidor, nada se pierde. */
const SOLAPE_MS = 30_000;
const MAX_VUELTAS_SUBIDA = 30;
const MAX_VUELTAS_BAJADA = 3;

// ---------------------------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------------------------

export async function contarPendientes(db: SQLiteDatabase): Promise<number> {
  const f = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM sync_cola');
  return f?.n ?? 0;
}

export interface EstadoSync {
  activo: boolean;
  pendientes: number;
  ultimaSync: string | null;
}

export async function estadoSync(db: SQLiteDatabase): Promise<EstadoSync> {
  return {
    activo: (await getAjuste(db, K_ACTIVO)) === '1',
    pendientes: await contarPendientes(db),
    ultimaSync: await getAjuste(db, K_ULTIMA),
  };
}

// ---------------------------------------------------------------------------------------------
// Saldos: se recalculan, no se sincronizan
// ---------------------------------------------------------------------------------------------

/**
 * saldo de cada cuenta = ingresos − gastos (sin contar lo eliminado), por forma de dinero.
 * Es la misma cuenta que las fases anteriores van haciendo paso a paso, hecha de una vez desde los movimientos.
 */
export async function recalcularSaldosCuentas(db: SQLiteDatabase): Promise<void> {
  const filas = await db.getAllAsync<{ forma: string; total: number }>(
    `SELECT forma, ROUND(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END), 2) AS total
       FROM movimientos
      WHERE deleted_at IS NULL
      GROUP BY forma`,
  );
  const ahora = new Date().toISOString();
  for (const forma of ['efectivo', 'transferencia', 'usd']) {
    const total = filas.find((f) => f.forma === forma)?.total ?? 0;
    await db.runAsync(
      `UPDATE cuentas SET saldo = ?, updated_at = ? WHERE tipo = ? AND saldo <> ?`,
      [total, ahora, forma, total],
    );
  }
}

// ---------------------------------------------------------------------------------------------
// Activación
// ---------------------------------------------------------------------------------------------

async function contarLocales(db: SQLiteDatabase): Promise<number> {
  const f = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM movimientos WHERE deleted_at IS NULL');
  return f?.n ?? 0;
}

/**
 * Primer paso al tener pareja: ¿hay que preguntar algo? Solo se pregunta si ESTE teléfono ya tiene
 * movimientos y la pareja también. Si uno de los dos está vacío, se activa directamente
 * (el vacío se llena con lo del otro).
 */
export async function prepararActivacion(
  db: SQLiteDatabase,
  cliente: ClienteSync,
  sesion: SesionSync,
): Promise<ResultadoActivacion> {
  const yaActiva =
    (await getAjuste(db, K_ACTIVO)) === '1' &&
    (await getAjuste(db, K_USUARIO)) === sesion.usuarioId &&
    (await getAjuste(db, K_PAREJA)) === sesion.parejaId;
  if (yaActiva) return { tipo: 'listo' };

  // Si este teléfono ya estuvo conectado a esta misma pareja (cerró sesión y volvió), no hay nada que preguntar.
  const mismaParejaDeAntes = (await getAjuste(db, K_PAREJA)) === sesion.parejaId;
  const locales = await contarLocales(db);
  if (locales > 0 && !mismaParejaDeAntes) {
    const resumen = (await llamarRpc(cliente, 'sync_resumen')) as { movimientos?: number } | null;
    const remotos = Number(resumen?.movimientos ?? 0);
    if (remotos > 0) return { tipo: 'decidir', locales, remotos };
  }
  await completarActivacion(db, sesion, 'unir');
  return { tipo: 'listo' };
}

/**
 * Activa la sincronización de esta cuenta.
 *  - 'unir': se conservan los movimientos de este teléfono y se suben junto a los de la pareja.
 *  - 'empezar': se BORRAN los movimientos, repartos y sectores nuevos de este teléfono y se baja todo lo de la pareja.
 * Los movimientos sin "registrado por" quedan a nombre de esta cuenta.
 */
export async function completarActivacion(
  db: SQLiteDatabase,
  sesion: SesionSync,
  modo: ModoUnion,
): Promise<void> {
  const parejaAnterior = await getAjuste(db, K_PAREJA);

  await db.withTransactionAsync(async () => {
    // Mientras se prepara, los disparadores no deben anotar nada.
    await setAjuste(db, K_ACTIVO, '0');
    await db.runAsync('DELETE FROM sync_cola');
    await db.runAsync('DELETE FROM sync_aplicando');

    if (modo === 'empezar') {
      await db.runAsync('DELETE FROM repartos');
      await db.runAsync('DELETE FROM movimientos');
      await db.runAsync(`DELETE FROM sectores WHERE tipo = 'personalizado'`);
      await recalcularSaldosCuentas(db);
    } else {
      // Lo que no tiene dueño (o tiene un dueño que no es de esta pareja) pasa a esta cuenta.
      const miembros = sesion.miembrosIds.includes(sesion.usuarioId)
        ? sesion.miembrosIds
        : [...sesion.miembrosIds, sesion.usuarioId];
      await db.runAsync(
        `UPDATE movimientos SET registrado_por = ?
          WHERE registrado_por IS NULL OR registrado_por NOT IN (${miembros.map(() => '?').join(', ')})`,
        [sesion.usuarioId, ...miembros],
      );
    }

    // Otra pareja (o empezar de nuevo): se baja desde el principio.
    if (modo === 'empezar' || parejaAnterior !== sesion.parejaId) {
      for (const t of ORDEN_TABLAS) await delAjuste(db, kCursor(t));
    }

    await setAjuste(db, K_USUARIO, sesion.usuarioId);
    await setAjuste(db, K_PAREJA, sesion.parejaId);

    // Subida inicial: todo lo local entra a la cola (es seguro repetirlo: subir es idempotente).
    for (const t of ORDEN_TABLAS) {
      await db.runAsync(`INSERT OR REPLACE INTO sync_cola (tabla, fila_id, seq) SELECT '${t}', id, rowid FROM ${t}`);
    }
    await setAjuste(db, K_ACTIVO, '1');
  });
}

/** Cierra la sincronización en este teléfono (por ejemplo, al cerrar sesión). Los datos locales no se tocan. */
export async function desactivar(db: SQLiteDatabase): Promise<void> {
  if ((await getAjuste(db, K_ACTIVO)) !== '1') return;
  await db.withTransactionAsync(async () => {
    await setAjuste(db, K_ACTIVO, '0');
    await db.runAsync('DELETE FROM sync_cola');
  });
}

// ---------------------------------------------------------------------------------------------
// Subir (push)
// ---------------------------------------------------------------------------------------------

interface Pendiente {
  tabla: TablaSync;
  fila: Record<string, unknown>;
  seq: number;
}

async function leerPendientes(db: SQLiteDatabase): Promise<Pendiente[]> {
  const todos: Pendiente[] = [];
  for (const t of ORDEN_TABLAS) {
    // Entradas de la cola cuyo registro ya no existe (no debería pasar): se descartan.
    await db.runAsync(
      `DELETE FROM sync_cola WHERE tabla = '${t}' AND NOT EXISTS (SELECT 1 FROM ${t} WHERE ${t}.id = sync_cola.fila_id)`,
    );
    const filas = await db.getAllAsync<Record<string, unknown>>(
      `SELECT x.*, c.seq AS _seq
         FROM sync_cola c JOIN ${t} x ON x.id = c.fila_id
        WHERE c.tabla = '${t}'
        ORDER BY c.seq ASC
        LIMIT ${LOTE_SUBIDA}`,
    );
    for (const f of filas) {
      const { _seq, ...fila } = f;
      todos.push({ tabla: t, fila, seq: Number(_seq) });
    }
  }
  return todos;
}

/**
 * Sube TODO lo pendiente, en lotes. Cada lote es "todo o nada" en el servidor (un ingreso y su reparto
 * llegan juntos). Un registro solo sale de la cola si NO cambió mientras se subía (mismo `seq`).
 */
export async function subirPendientes(db: SQLiteDatabase, cliente: ClienteSync): Promise<number> {
  let subidos = 0;
  for (let vuelta = 0; vuelta < MAX_VUELTAS_SUBIDA; vuelta++) {
    const pendientes = await leerPendientes(db);
    if (pendientes.length === 0) break;

    const por = (t: TablaSync) => pendientes.filter((p) => p.tabla === t).map((p) => p.fila);
    await llamarRpc(cliente, 'sync_push', {
      p_sectores: por('sectores'),
      p_movimientos: por('movimientos'),
      p_repartos: por('repartos'),
    });

    await db.withTransactionAsync(async () => {
      for (const p of pendientes) {
        await db.runAsync('DELETE FROM sync_cola WHERE tabla = ? AND fila_id = ? AND seq = ?', [
          p.tabla,
          String(p.fila.id),
          p.seq,
        ]);
      }
    });
    subidos += pendientes.length;
  }
  return subidos;
}

// ---------------------------------------------------------------------------------------------
// Bajar (pull)
// ---------------------------------------------------------------------------------------------

interface Cursor {
  ts: string;
  id: string;
}

function leerCursor(valor: string | null): Cursor | null {
  if (!valor) return null;
  try {
    const c = JSON.parse(valor) as Partial<Cursor>;
    return typeof c.ts === 'string' && typeof c.id === 'string' ? { ts: c.ts, id: c.id } : null;
  } catch {
    return null;
  }
}

/** ¿a es posterior a b? Compara (hora de llegada al servidor, id). */
function posterior(a: Cursor, b: Cursor | null): boolean {
  if (!b) return true;
  const ta = aIsoLocal(a.ts) ?? a.ts;
  const tb = aIsoLocal(b.ts) ?? b.ts;
  return ta > tb || (ta === tb && a.id > b.id);
}

interface FilaRemota {
  datos: Record<string, unknown>;
  cursor: Cursor;
}

/** Pide a Supabase todo lo que llegó después del cursor (con un pequeño solape), en páginas. */
async function pedirTabla(
  db: SQLiteDatabase,
  cliente: ClienteSync,
  tabla: TablaSync,
): Promise<FilaRemota[]> {
  const cursor = leerCursor(await getAjuste(db, kCursor(tabla)));
  const iso = cursor ? aIsoLocal(cursor.ts) : null;
  let ts: string | undefined = iso ? restarMs(iso, SOLAPE_MS) : undefined;
  let id: string | undefined = iso ? '' : undefined;
  const filas: FilaRemota[] = [];

  for (let pagina = 0; pagina < 1000; pagina++) {
    const args: Record<string, unknown> = { p_tabla: tabla, p_limite: LOTE_BAJADA };
    if (ts !== undefined) args.p_ts = ts;
    if (id !== undefined) args.p_id = id;
    const data = await llamarRpc(cliente, 'sync_pull', args);
    const lote = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
    for (const d of lote) {
      const sts = typeof d.server_updated_at === 'string' ? d.server_updated_at : '';
      filas.push({ datos: d, cursor: { ts: sts, id: String(d.id ?? '') } });
    }
    if (lote.length < LOTE_BAJADA) break;
    const ultima = filas[filas.length - 1].cursor;
    ts = ultima.ts;
    id = ultima.id;
  }
  return filas;
}

async function existe(db: SQLiteDatabase, tabla: string, id: unknown): Promise<boolean> {
  const f = await db.getFirstAsync<{ x: number }>(`SELECT 1 AS x FROM ${tabla} WHERE id = ?`, [id as string]);
  return f !== null;
}

/** ¿Falta algo de lo que esta fila necesita (su sector o su movimiento)? */
async function faltaDependencia(db: SQLiteDatabase, tabla: TablaSync, fila: FilaLocal): Promise<boolean> {
  if (tabla === 'movimientos') return !(await existe(db, 'sectores', fila.sector_id));
  if (tabla === 'repartos') {
    return !(await existe(db, 'movimientos', fila.movimiento_id)) || !(await existe(db, 'sectores', fila.sector_id));
  }
  return false;
}

/**
 * Un ingreso y su reparto son UNA unidad, pero viajan como filas separadas. Si dos teléfonos editan el mismo
 * ingreso sin internet, cada uno crea su propio reparto nuevo y al juntarse quedarían los dos. Regla:
 *  - los repartos de un ingreso eliminado se eliminan;
 *  - si un ingreso tiene repartos de varias ediciones, gana la edición más reciente (la que comparte
 *    `created_at` más nuevo: todos los repartos de una edición se crean en el mismo instante).
 * Estos cambios SÍ se anotan como pendientes: así la pareja llega al mismo resultado.
 */
export async function repararRepartos(db: SQLiteDatabase): Promise<number> {
  const ahora = new Date().toISOString();
  const a = await db.runAsync(
    `UPDATE repartos SET deleted_at = ?, updated_at = ?
      WHERE deleted_at IS NULL
        AND movimiento_id IN (SELECT id FROM movimientos WHERE deleted_at IS NOT NULL)`,
    [ahora, ahora],
  );
  const b = await db.runAsync(
    `UPDATE repartos SET deleted_at = ?, updated_at = ?
      WHERE deleted_at IS NULL
        AND created_at < (SELECT MAX(r2.created_at) FROM repartos r2
                           WHERE r2.movimiento_id = repartos.movimiento_id AND r2.deleted_at IS NULL)`,
    [ahora, ahora],
  );
  return a.changes + b.changes;
}

interface ResultadoAplicar {
  cambiados: number;
  bloqueadas: number;
}

/**
 * Aplica lo bajado a la base local, en UNA transacción (sectores → movimientos → repartos), y guarda los
 * cursores. Cada fila se aplica solo si no es más vieja que la local. Si una fila necesita algo que todavía
 * no llegó, se detiene ahí en esa tabla y el cursor no pasa de ese punto (se reintenta).
 */
async function aplicarBajado(
  db: SQLiteDatabase,
  lotes: Record<TablaSync, FilaRemota[]>,
): Promise<ResultadoAplicar> {
  let cambiados = 0;
  let bloqueadas = 0;

  await db.withTransactionAsync(async () => {
    for (const tabla of ORDEN_TABLAS) {
      const filas = lotes[tabla];
      if (filas.length === 0) continue;

      const cursorViejo = leerCursor(await getAjuste(db, kCursor(tabla)));
      let ultimoAplicado: Cursor | null = null;
      const upsert = sqlUpsert(tabla);

      for (const r of filas) {
        const fila = aFilaLocal(tabla, r.datos);
        if (fila === null) {
          ultimoAplicado = r.cursor; // fila dañada: se omite, no bloquea al resto
          continue;
        }
        if (await faltaDependencia(db, tabla, fila)) {
          bloqueadas++;
          break;
        }

        const local = await db.getFirstAsync<Record<string, unknown>>(`SELECT * FROM ${tabla} WHERE id = ?`, [
          fila.id as string,
        ]);
        if (!local || !filasIguales(tabla, local, fila)) {
          const marca = [tabla, fila.id as string];
          // La marca evita que este cambio (que viene de la pareja) se anote como pendiente para subir.
          await db.runAsync('INSERT OR REPLACE INTO sync_aplicando (tabla, fila_id) VALUES (?, ?)', marca);
          const res = await db.runAsync(upsert, TABLAS[tabla].columnas.map((c) => fila[c]));
          await db.runAsync('DELETE FROM sync_aplicando WHERE tabla = ? AND fila_id = ?', marca);
          if (res.changes > 0) cambiados++;
        }
        ultimoAplicado = r.cursor;
      }

      if (ultimoAplicado && posterior(ultimoAplicado, cursorViejo)) {
        await setAjuste(db, kCursor(tabla), JSON.stringify(ultimoAplicado));
      }
    }
    if (cambiados > 0) {
      cambiados += await repararRepartos(db);
      await recalcularSaldosCuentas(db);
    }
  });

  return { cambiados, bloqueadas };
}

/** Baja lo nuevo de la pareja. Devuelve cuántos registros cambiaron aquí. */
export async function bajarCambios(db: SQLiteDatabase, cliente: ClienteSync): Promise<number> {
  let total = 0;
  for (let vuelta = 0; vuelta < MAX_VUELTAS_BAJADA; vuelta++) {
    const lotes = {} as Record<TablaSync, FilaRemota[]>;
    for (const t of ORDEN_TABLAS) lotes[t] = await pedirTabla(db, cliente, t);
    const { cambiados, bloqueadas } = await aplicarBajado(db, lotes);
    total += cambiados;
    if (bloqueadas === 0) break;
  }
  return total;
}

// ---------------------------------------------------------------------------------------------
// Sincronizar (subir y bajar)
// ---------------------------------------------------------------------------------------------

const enCurso = new WeakMap<object, Promise<ResultadoSync>>();

/**
 * Sube lo pendiente y baja lo nuevo. Si ya hay una sincronización en marcha en esta base, espera esa
 * (nunca corren dos a la vez). Lanza `ErrorCuenta` (mensaje en español) si falla; lo pendiente queda en la cola.
 */
export function sincronizar(db: SQLiteDatabase, cliente: ClienteSync): Promise<ResultadoSync> {
  const actual = enCurso.get(db);
  if (actual) return actual;

  const tarea = (async (): Promise<ResultadoSync> => {
    if ((await getAjuste(db, K_ACTIVO)) !== '1') {
      return { subidos: 0, bajados: 0, pendientes: await contarPendientes(db) };
    }
    let subidos = await subirPendientes(db, cliente);
    const bajados = await bajarCambios(db, cliente);
    // Si al bajar hubo que arreglar algo (ver `repararRepartos`), se sube enseguida.
    if (bajados > 0 && (await contarPendientes(db)) > 0) subidos += await subirPendientes(db, cliente);
    await setAjuste(db, K_ULTIMA, new Date().toISOString());
    return { subidos, bajados, pendientes: await contarPendientes(db) };
  })();

  enCurso.set(db, tarea);
  const limpiar = () => {
    enCurso.delete(db);
  };
  tarea.then(limpiar, limpiar);
  return tarea;
}