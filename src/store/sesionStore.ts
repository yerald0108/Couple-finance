import type { SQLiteDatabase } from 'expo-sqlite';
import { createStore, type StoreApi } from 'zustand/vanilla';
import {
  guardarParejaCache,
  guardarUsuarioCache,
  leerCacheSincronizacion,
  limpiarCacheSincronizacion,
} from '../db/queries/sincronizacion';
import * as servicio from '../lib/cuentaService';
import {
  ErrorCuenta,
  type ClienteCuentas,
  type MiembroPareja,
  type ParejaInfo,
  type UsuarioCuenta,
} from '../lib/cuentaService';
import { mensajeError } from '../utils/errors';

export interface SesionState {
  /** false = no hay dirección/llave de Supabase: la app funciona solo en local. */
  configurado: boolean;
  /** true hasta que `iniciar` termina de leer lo guardado en el teléfono. */
  cargando: boolean;
  usuario: UsuarioCuenta | null;
  pareja: ParejaInfo | null;
  /** Mi nombre y el de mi pareja salen de aquí (para las etiquetas "registrado por" de la Fase 8B). */
  miembros: MiembroPareja[];
  /** true si el último intento de hablar con Supabase falló por falta de internet. */
  sinConexion: boolean;

  /** Lee lo guardado (funciona sin internet) y después comprueba la sesión y la pareja en Supabase. */
  iniciar: (db: SQLiteDatabase) => Promise<void>;
  /** Vuelve a leer la pareja desde Supabase (por ejemplo, para ver que ya se unió la otra persona). */
  refrescar: (db: SQLiteDatabase) => Promise<void>;
  registrarse: (db: SQLiteDatabase, email: string, password: string) => Promise<void>;
  entrar: (db: SQLiteDatabase, email: string, password: string) => Promise<void>;
  salir: (db: SQLiteDatabase) => Promise<void>;
  crearPareja: (db: SQLiteDatabase, nombre: string) => Promise<void>;
  unirPareja: (db: SQLiteDatabase, codigo: string, nombre: string) => Promise<void>;
  cambiarNombre: (db: SQLiteDatabase, nombre: string) => Promise<void>;
}

const ERROR_SIN_CONFIGURAR = 'Supabase no está configurado en esta app.';

/**
 * Estado de la cuenta y la pareja. Las acciones LANZAN un error con mensaje en español si algo falla
 * (la pantalla lo muestra); `iniciar` y `refrescar` nunca lanzan: si no hay internet se queda con lo guardado.
 * El cliente se recibe por parámetro para poder probarlo sin internet.
 */
export function crearSesionStore(cliente: ClienteCuentas | null): StoreApi<SesionState> {
  return createStore<SesionState>()((set, get) => {
    function requerirCliente(): ClienteCuentas {
      if (!cliente) throw new ErrorCuenta(ERROR_SIN_CONFIGURAR);
      return cliente;
    }

    async function aplicarPareja(db: SQLiteDatabase, pareja: ParejaInfo | null) {
      await guardarParejaCache(db, pareja);
      set({ pareja, miembros: pareja?.miembros ?? [], sinConexion: false });
    }

    /** Ejecuta una acción de pareja; si falla por falta de internet lo deja anotado y vuelve a lanzar. */
    async function conAviso<T>(f: () => Promise<T>): Promise<T> {
      try {
        return await f();
      } catch (e) {
        if (e instanceof ErrorCuenta && e.sinConexion) set({ sinConexion: true });
        throw e instanceof ErrorCuenta ? e : new ErrorCuenta(mensajeError(e));
      }
    }

    return {
      configurado: cliente !== null,
      cargando: true,
      usuario: null,
      pareja: null,
      miembros: [],
      sinConexion: false,

      iniciar: async (db) => {
        // 1) Lo guardado en el teléfono (instantáneo y sin internet).
        try {
          const cache = await leerCacheSincronizacion(db);
          set({ usuario: cache.usuario, pareja: cache.pareja, miembros: cache.pareja?.miembros ?? [] });
        } catch {
          // Si falla la lectura local se sigue como "sin cuenta".
        }
        set({ cargando: false });
        if (!cliente) return;

        // 2) Confirmar con Supabase.
        const estado = await servicio.sesionActual(cliente);
        if (estado.tipo === 'sin_conexion') {
          set({ sinConexion: true });
          return;
        }
        if (estado.tipo === 'ninguna') {
          // Sesión perdida: se olvida la cuenta (los movimientos locales NO se tocan).
          try {
            await limpiarCacheSincronizacion(db);
          } catch {
            // ignorado: solo es una copia
          }
          set({ usuario: null, pareja: null, miembros: [], sinConexion: false });
          return;
        }
        try {
          await guardarUsuarioCache(db, estado.usuario);
        } catch {
          // ignorado
        }
        set({ usuario: estado.usuario });
        await get().refrescar(db);
      },

      refrescar: async (db) => {
        if (!cliente || !get().usuario) return;
        try {
          await aplicarPareja(db, await servicio.getPareja(cliente));
        } catch (e) {
          // Sin internet (o error pasajero) se conserva lo que había.
          set({ sinConexion: e instanceof ErrorCuenta && e.sinConexion });
        }
      },

      registrarse: async (db, email, password) => {
        const usuario = await conAviso(() => servicio.registrarse(requerirCliente(), { email, password }));
        await guardarUsuarioCache(db, usuario);
        await guardarParejaCache(db, null);
        set({ usuario, pareja: null, miembros: [], sinConexion: false });
        // Por si el correo ya estaba en una pareja (cuenta reutilizada): se lee lo que haya.
        await get().refrescar(db);
      },

      entrar: async (db, email, password) => {
        const usuario = await conAviso(() => servicio.entrar(requerirCliente(), { email, password }));
        await guardarUsuarioCache(db, usuario);
        set({ usuario, sinConexion: false });
        // Quien ya tenía pareja (otro teléfono, reinstalación) la recupera automáticamente.
        await get().refrescar(db);
      },

      salir: async (db) => {
        // Se cierra la sesión solo en este teléfono. Aunque falle algo, la copia local se limpia
        // para no quedar "a medias" (los movimientos y saldos no se tocan).
        try {
          await servicio.salir(requerirCliente());
        } catch {
          // La sesión ya no se usará: la persona queda sin cuenta en la app de todos modos.
        }
        await limpiarCacheSincronizacion(db);
        set({ usuario: null, pareja: null, miembros: [], sinConexion: false });
      },

      crearPareja: async (db, nombre) => {
        const pareja = await conAviso(() => servicio.crearPareja(requerirCliente(), nombre));
        await aplicarPareja(db, pareja);
      },

      unirPareja: async (db, codigo, nombre) => {
        const pareja = await conAviso(() => servicio.unirPareja(requerirCliente(), codigo, nombre));
        await aplicarPareja(db, pareja);
      },

      cambiarNombre: async (db, nombre) => {
        const pareja = await conAviso(() => servicio.cambiarMiNombre(requerirCliente(), nombre));
        await aplicarPareja(db, pareja);
      },
    };
  });
}