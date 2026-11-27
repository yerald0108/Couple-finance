/**
 * Tiempo real (Fase 8C).
 *
 * Abre un canal de Supabase Realtime con los cambios de las tablas de la pareja. El aviso NO se usa
 * para escribir datos: solo es una señal de "hay algo nuevo, sincroniza". Así el motor de la Fase 8B
 * sigue siendo el único que escribe en la base local (con su orden, su last-write-wins y sus cursores),
 * y si el aviso se pierde, la consulta periódica lo recupera.
 *
 * No importa `@supabase/supabase-js`: recibe el cliente por parámetro para poder probarse sin internet.
 */

export type EstadoTiempoReal = 'apagado' | 'conectando' | 'conectado' | 'reconectando';

/** Tablas de las que se escuchan cambios (las mismas que sincroniza el motor). */
export const TABLAS_TIEMPO_REAL = ['sectores', 'movimientos', 'repartos'] as const;

/** Espera tras el primer aviso antes de sincronizar, para juntar los avisos de un mismo guardado (un ingreso trae varios). */
export const ESPERA_AVISOS_MS = 400;

interface FiltroCambios {
  event: '*';
  schema: 'public';
  table: string;
  filter: string;
}

/** Lo mínimo que se usa de un canal de Supabase Realtime. */
export interface CanalTiempoReal {
  on(tipo: 'postgres_changes', filtro: FiltroCambios, alRecibir: (payload: unknown) => void): CanalTiempoReal;
  subscribe(alEstado?: (estado: string, error?: Error) => void): unknown;
}

/** Lo mínimo que se usa del cliente de Supabase. */
export interface ClienteTiempoReal {
  channel(nombre: string): CanalTiempoReal;
  removeChannel(canal: CanalTiempoReal): PromiseLike<unknown> | unknown;
}

export interface OpcionesTiempoReal {
  parejaId: string;
  /** Se llama (una sola vez por ráfaga de avisos) cuando conviene sincronizar. */
  alCambiar: () => void;
  /** Se llama cada vez que cambia el estado de la conexión. */
  alEstado?: (estado: EstadoTiempoReal) => void;
  /** Para pruebas. */
  esperaMs?: number;
}

/** Traduce el estado que informa Supabase al nuestro. */
export function estadoDesdeSupabase(estado: string): EstadoTiempoReal {
  if (estado === 'SUBSCRIBED') return 'conectado';
  if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') return 'reconectando';
  return 'apagado';
}

/**
 * Empieza a escuchar los cambios de la pareja. Devuelve la función que deja de escuchar
 * (cierra el canal y cancela cualquier aviso pendiente). Nunca lanza.
 */
export function iniciarTiempoReal(cliente: ClienteTiempoReal, opciones: OpcionesTiempoReal): () => void {
  const { parejaId, alCambiar, alEstado } = opciones;
  const espera = opciones.esperaMs ?? ESPERA_AVISOS_MS;
  let detenido = false;
  let temporizador: ReturnType<typeof setTimeout> | null = null;
  let canal: CanalTiempoReal | null = null;

  const avisarEstado = (e: EstadoTiempoReal) => {
    if (!detenido) alEstado?.(e);
  };

  const senal = () => {
    if (detenido || temporizador !== null) return;
    temporizador = setTimeout(() => {
      temporizador = null;
      if (!detenido) alCambiar();
    }, espera);
  };

  try {
    avisarEstado('conectando');
    let c = cliente.channel(`pareja-${parejaId}`);
    for (const tabla of TABLAS_TIEMPO_REAL) {
      c = c.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tabla, filter: `pareja_id=eq.${parejaId}` },
        senal,
      );
    }
    canal = c;
    c.subscribe((estado) => {
      if (detenido) return;
      const e = estadoDesdeSupabase(estado);
      avisarEstado(e);
      // Al (re)conectar se pide lo que pudo llegar mientras no se escuchaba.
      if (e === 'conectado') senal();
    });
  } catch {
    avisarEstado('apagado');
  }

  return () => {
    if (detenido) return;
    detenido = true;
    if (temporizador !== null) clearTimeout(temporizador);
    temporizador = null;
    if (canal) {
      try {
        const r = cliente.removeChannel(canal);
        if (r && typeof (r as PromiseLike<unknown>).then === 'function') {
          (r as PromiseLike<unknown>).then(undefined, () => undefined);
        }
      } catch {
        // cerrar el canal es "lo mejor posible"
      }
    }
    alEstado?.('apagado');
  };
}