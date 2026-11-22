import type { SQLiteDatabase } from 'expo-sqlite';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { ErrorCuenta } from '../lib/cuentaService';
import { mensajeError } from '../utils/errors';
import {
  completarActivacion,
  contarPendientes,
  desactivar,
  estadoSync,
  prepararActivacion,
  sincronizar,
  type ClienteSync,
  type ModoUnion,
  type SesionSync,
} from '../sync/motor';
import type { EstadoTiempoReal } from '../sync/tiempoReal';

export type EstadoSincronizacion =
  /** Sin pareja o sin sesión: no se sincroniza nada. */
  | 'inactivo'
  /** Este teléfono y la pareja ya tienen movimientos: falta elegir cómo unirlos. */
  | 'decidir'
  | 'sincronizando'
  | 'ok'
  | 'sin_conexion'
  | 'error';

export interface SyncState {
  estado: EstadoSincronizacion;
  activo: boolean;
  pendientes: number;
  /** Cuándo terminó la última sincronización (ISO). */
  ultimaSync: string | null;
  error: string | null;
  /** Datos de la pregunta "unir o empezar" (solo cuando estado = 'decidir'). */
  decision: { locales: number; remotos: number } | null;
  /** Sube cada vez que llegaron cambios de la pareja: las pantallas lo usan para volver a leer la base. */
  datosVersion: number;
  /** Estado de la conexión en tiempo real con Supabase (la consulta periódica sigue como respaldo). */
  tiempoReal: EstadoTiempoReal;

  /** Lo fija `SyncIniciador` según el canal de tiempo real. */
  fijarTiempoReal: (estado: EstadoTiempoReal) => void;
  /** Prepara y arranca la sincronización de esta cuenta (si hay que decidir, se queda esperando). */
  preparar: (db: SQLiteDatabase, sesion: SesionSync) => Promise<void>;
  /** Respuesta a la pregunta "unir o empezar". */
  decidir: (db: SQLiteDatabase, sesion: SesionSync, modo: ModoUnion) => Promise<void>;
  /** Sube y baja cambios ahora. Nunca lanza: el resultado queda en `estado` y `error`. */
  sincronizar: (db: SQLiteDatabase) => Promise<void>;
  /** Apaga la sincronización en este teléfono (cerrar sesión). Los datos locales no se tocan. */
  desactivar: (db: SQLiteDatabase) => Promise<void>;
  /** Vuelve a leer cuántos cambios están pendientes. */
  leerPendientes: (db: SQLiteDatabase) => Promise<void>;
}

const ERROR_SIN_CONFIGURAR = 'Supabase no está configurado en esta app.';

/** Estado de la sincronización. El cliente se recibe por parámetro para poder probarlo sin internet. */
export function crearSyncStore(cliente: ClienteSync | null): StoreApi<SyncState> {
  return createStore<SyncState>()((set, get) => {
    function aEstadoDeError(e: unknown): Partial<SyncState> {
      const sinConexion = e instanceof ErrorCuenta && e.sinConexion;
      return {
        estado: sinConexion ? 'sin_conexion' : 'error',
        error: sinConexion ? null : mensajeError(e),
      };
    }

    return {
      estado: 'inactivo',
      activo: false,
      pendientes: 0,
      ultimaSync: null,
      error: null,
      decision: null,
      datosVersion: 0,
      tiempoReal: 'apagado',

      fijarTiempoReal: (estado) => {
        if (get().tiempoReal !== estado) set({ tiempoReal: estado });
      },

      preparar: async (db, sesion) => {
        if (!cliente) return;
        try {
          const r = await prepararActivacion(db, cliente, sesion);
          if (r.tipo === 'decidir') {
            set({ estado: 'decidir', activo: false, decision: { locales: r.locales, remotos: r.remotos }, error: null });
            return;
          }
          set({ activo: true, decision: null });
        } catch (e) {
          set({ activo: false, ...aEstadoDeError(e) });
          return;
        }
        await get().sincronizar(db);
      },

      decidir: async (db, sesion, modo) => {
        try {
          await completarActivacion(db, sesion, modo);
          set({ activo: true, decision: null, datosVersion: get().datosVersion + (modo === 'empezar' ? 1 : 0) });
        } catch (e) {
          set(aEstadoDeError(e));
          throw e instanceof Error ? e : new Error(mensajeError(e));
        }
        await get().sincronizar(db);
      },

      sincronizar: async (db) => {
        if (!cliente) {
          set({ estado: 'inactivo', error: ERROR_SIN_CONFIGURAR });
          return;
        }
        try {
          if (!(await estadoSync(db)).activo) {
            set({ activo: false, pendientes: await contarPendientes(db) });
            return;
          }
          set({ estado: 'sincronizando', activo: true });
          const r = await sincronizar(db, cliente);
          set({
            estado: 'ok',
            error: null,
            pendientes: r.pendientes,
            ultimaSync: (await estadoSync(db)).ultimaSync,
            datosVersion: get().datosVersion + (r.bajados > 0 ? 1 : 0),
          });
        } catch (e) {
          let pendientes = get().pendientes;
          try {
            pendientes = await contarPendientes(db);
          } catch {
            // se conserva el número anterior
          }
          set({ ...aEstadoDeError(e), pendientes });
        }
      },

      desactivar: async (db) => {
        try {
          await desactivar(db);
        } catch {
          // si falla, el próximo arranque lo vuelve a intentar
        }
        set({ estado: 'inactivo', activo: false, pendientes: 0, decision: null, error: null, tiempoReal: 'apagado' });
      },

      leerPendientes: async (db) => {
        try {
          set({ pendientes: await contarPendientes(db) });
        } catch {
          // ignorado
        }
      },
    };
  });
}