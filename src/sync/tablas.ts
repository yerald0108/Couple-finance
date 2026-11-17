/**
 * Qué columnas se sincronizan de cada tabla y cómo se convierte una fila que llega de Supabase
 * (fechas con microsegundos, números) en una fila de la base local.
 */

export type TablaSync = 'sectores' | 'movimientos' | 'repartos';

/** Orden obligatorio: un movimiento necesita su sector y un reparto necesita su movimiento y su sector. */
export const ORDEN_TABLAS: TablaSync[] = ['sectores', 'movimientos', 'repartos'];

interface DefTabla {
  columnas: string[];
  /** Columnas que son fecha y hora (se guardan como texto ISO con milisegundos y "Z"). */
  fechas: string[];
  /** Columnas obligatorias (si faltan, la fila se descarta). */
  obligatorias: string[];
}

export const TABLAS: Record<TablaSync, DefTabla> = {
  sectores: {
    columnas: ['id', 'nombre', 'descripcion', 'tipo', 'icono', 'color', 'activo', 'orden', 'created_at', 'updated_at', 'deleted_at'],
    fechas: ['created_at', 'updated_at', 'deleted_at'],
    obligatorias: ['id', 'nombre', 'tipo', 'created_at', 'updated_at'],
  },
  movimientos: {
    columnas: [
      'id', 'tipo', 'monto', 'forma', 'concepto', 'origen', 'sector_id', 'motivo_ahorro',
      'es_salida_ahorro', 'fecha', 'registrado_por', 'created_at', 'updated_at', 'deleted_at',
    ],
    fechas: ['fecha', 'created_at', 'updated_at', 'deleted_at'],
    obligatorias: ['id', 'tipo', 'monto', 'forma', 'sector_id', 'fecha', 'created_at', 'updated_at'],
  },
  repartos: {
    columnas: ['id', 'movimiento_id', 'sector_id', 'monto', 'created_at', 'updated_at', 'deleted_at'],
    fechas: ['created_at', 'updated_at', 'deleted_at'],
    obligatorias: ['id', 'movimiento_id', 'sector_id', 'monto', 'created_at', 'updated_at'],
  },
};

export type FilaLocal = Record<string, string | number | null>;

/**
 * "2026-11-16T05:08:20.089932+00:00" → "2026-11-16T05:08:20.089Z".
 * Se separa a mano (en vez de confiar en Date.parse) porque no todos los motores de JavaScript aceptan
 * microsegundos o el formato "+00:00". Devuelve null si el texto no es una fecha válida.
 */
export function aIsoLocal(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}(?::?\d{2})?)$/.exec(valor.trim());
  if (!m) return null;
  const ms = (m[3] ?? '').padEnd(3, '0').slice(0, 3);
  let zona = m[4];
  if (zona !== 'Z') {
    const digitos = zona.slice(1).replace(':', '');
    zona = `${zona[0]}${digitos.slice(0, 2)}:${digitos.slice(2).padEnd(2, '0')}`;
  }
  const fecha = new Date(`${m[1]}T${m[2]}.${ms}${zona}`);
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

/** Resta milisegundos a una fecha ISO (devuelve otra fecha ISO). */
export function restarMs(iso: string, ms: number): string {
  return new Date(new Date(iso).getTime() - ms).toISOString();
}

/**
 * Convierte una fila de Supabase en una fila local, o devuelve null si le falta algo obligatorio
 * o tiene una fecha inválida (esa fila se omite en vez de romper toda la sincronización).
 */
export function aFilaLocal(tabla: TablaSync, remoto: Record<string, unknown>): FilaLocal | null {
  const def = TABLAS[tabla];
  const fila: FilaLocal = {};

  for (const col of def.columnas) {
    const v = remoto[col];
    if (v === undefined || v === null) {
      if (def.obligatorias.includes(col)) return null;
      fila[col] = null;
    } else if (def.fechas.includes(col)) {
      const iso = aIsoLocal(v);
      if (iso === null) return null;
      fila[col] = iso;
    } else if (typeof v === 'number' || typeof v === 'string') {
      fila[col] = v;
    } else if (typeof v === 'boolean') {
      fila[col] = v ? 1 : 0;
    } else {
      return null;
    }
  }

  if (typeof fila.id !== 'string' || fila.id === '') return null;
  // El servidor devuelve números como número; si llegara como texto ("12.50") se convierte.
  for (const col of ['monto', 'activo', 'orden', 'es_salida_ahorro']) {
    if (col in fila && typeof fila[col] === 'string') {
      const n = Number(fila[col]);
      if (!Number.isFinite(n)) return null;
      fila[col] = n;
    }
  }
  if ('activo' in fila && fila.activo === null) fila.activo = 1;
  if ('orden' in fila && fila.orden === null) fila.orden = 0;
  if ('es_salida_ahorro' in fila && fila.es_salida_ahorro === null) fila.es_salida_ahorro = 0;
  return fila;
}

/** SQL que inserta la fila o, si ya existe, la reemplaza SOLO si la versión que llega no es más vieja. */
export function sqlUpsert(tabla: TablaSync): string {
  const cols = TABLAS[tabla].columnas;
  const sets = cols.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`);
  return (
    `INSERT INTO ${tabla} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')}) ` +
    `ON CONFLICT(id) DO UPDATE SET ${sets.join(', ')} WHERE excluded.updated_at >= ${tabla}.updated_at`
  );
}

/** ¿La fila local ya es idéntica a la que llegó? (Así no se reescribe lo que no cambió.) */
export function filasIguales(tabla: TablaSync, local: Record<string, unknown>, remota: FilaLocal): boolean {
  return TABLAS[tabla].columnas.every((c) => (local[c] ?? null) === (remota[c] ?? null));
}