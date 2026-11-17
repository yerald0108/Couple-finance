/**
 * Cuenta y pareja con Supabase. Recibe el "cliente" como parámetro (en la app es el de supabase.ts;
 * en las pruebas es uno falso), y siempre lanza `ErrorCuenta` con el mensaje YA en español.
 */
import { esErrorDeRed, traducirErrorSupabase } from '../utils/cuentaValidation';

export interface UsuarioCuenta {
  id: string;
  email: string | null;
}

export interface MiembroPareja {
  user_id: string;
  nombre: string;
  soy_yo: boolean;
}

export interface ParejaInfo {
  pareja_id: string;
  codigo: string;
  miembros: MiembroPareja[];
}

export class ErrorCuenta extends Error {
  /** true = fue por falta de conexión (la app debe seguir con lo que tiene guardado). */
  readonly sinConexion: boolean;
  constructor(mensaje: string, sinConexion = false) {
    super(mensaje);
    this.name = 'ErrorCuenta';
    this.sinConexion = sinConexion;
  }
}

interface ErrorSupabase {
  message: string;
  code?: string;
  name?: string;
  status?: number;
}

interface UsuarioSupabase {
  id: string;
  email?: string | undefined;
}

/** Lo mínimo que se usa del cliente de Supabase (así se puede reemplazar en las pruebas). */
export interface ClienteCuentas {
  auth: {
    signUp(credenciales: { email: string; password: string }): PromiseLike<{
      data: { user: UsuarioSupabase | null; session: object | null };
      error: ErrorSupabase | null;
    }>;
    signInWithPassword(credenciales: { email: string; password: string }): PromiseLike<{
      data: { user: UsuarioSupabase | null; session: object | null };
      error: ErrorSupabase | null;
    }>;
    signOut(opciones?: { scope?: 'global' | 'local' | 'others' }): PromiseLike<{ error: ErrorSupabase | null }>;
    getSession(): PromiseLike<{
      data: { session: { user: UsuarioSupabase } | null };
      error: ErrorSupabase | null;
    }>;
  };
  rpc(nombre: string, argumentos?: Record<string, unknown>): PromiseLike<{ data: unknown; error: ErrorSupabase | null }>;
}

function aErrorCuenta(e: unknown): ErrorCuenta {
  if (e instanceof ErrorCuenta) return e;
  return new ErrorCuenta(traducirErrorSupabase(e), esErrorDeRed(e));
}

function aUsuario(u: UsuarioSupabase): UsuarioCuenta {
  return { id: u.id, email: u.email ?? null };
}

/** Ejecuta una llamada a Supabase; si falla (devuelve error o lanza) lo convierte en ErrorCuenta. */
async function llamar<T extends { error: ErrorSupabase | null }>(f: () => PromiseLike<T>): Promise<T> {
  let r: T;
  try {
    r = await f();
  } catch (e) {
    throw aErrorCuenta(e);
  }
  if (r.error) throw aErrorCuenta(r.error);
  return r;
}

/** Llama a una función de Supabase y devuelve su resultado; si falla lanza `ErrorCuenta` (mensaje en español). */
export async function llamarRpc(
  cliente: Pick<ClienteCuentas, 'rpc'>,
  nombre: string,
  argumentos?: Record<string, unknown>,
): Promise<unknown> {
  const { data } = await llamar(() => cliente.rpc(nombre, argumentos));
  return data;
}

export async function registrarse(
  cliente: ClienteCuentas,
  datos: { email: string; password: string },
): Promise<UsuarioCuenta> {
  const { data } = await llamar(() => cliente.auth.signUp(datos));
  if (!data.user || !data.session) {
    // Supabase tiene "Confirm email" activado: crea la cuenta pero no inicia sesión hasta confirmar.
    throw new ErrorCuenta(
      'La cuenta necesita confirmar el correo antes de entrar. Revisa tu bandeja de entrada. ' +
        '(Si eres tú quien configura Supabase: desactiva «Confirm email» en Authentication → Providers → Email).',
    );
  }
  return aUsuario(data.user);
}

export async function entrar(
  cliente: ClienteCuentas,
  datos: { email: string; password: string },
): Promise<UsuarioCuenta> {
  const { data } = await llamar(() => cliente.auth.signInWithPassword(datos));
  if (!data.user) throw new ErrorCuenta('No se pudo entrar. Inténtalo otra vez.');
  return aUsuario(data.user);
}

/** Cierra la sesión solo en este teléfono (funciona sin internet). */
export async function salir(cliente: ClienteCuentas): Promise<void> {
  await llamar(() => cliente.auth.signOut({ scope: 'local' }));
}

export type EstadoSesion =
  | { tipo: 'activa'; usuario: UsuarioCuenta }
  /** No hay sesión (nunca se entró, o venció y no se pudo renovar). */
  | { tipo: 'ninguna' }
  /** No se pudo comprobar por falta de internet: se mantiene lo que había guardado. */
  | { tipo: 'sin_conexion' };

export async function sesionActual(cliente: ClienteCuentas): Promise<EstadoSesion> {
  let r;
  try {
    r = await cliente.auth.getSession();
  } catch (e) {
    return esErrorDeRed(e) ? { tipo: 'sin_conexion' } : { tipo: 'ninguna' };
  }
  if (r.error) return esErrorDeRed(r.error) ? { tipo: 'sin_conexion' } : { tipo: 'ninguna' };
  return r.data.session ? { tipo: 'activa', usuario: aUsuario(r.data.session.user) } : { tipo: 'ninguna' };
}

function comoPareja(data: unknown): ParejaInfo | null {
  if (data === null || data === undefined) return null;
  const o = data as Partial<ParejaInfo>;
  if (typeof o.pareja_id !== 'string' || typeof o.codigo !== 'string' || !Array.isArray(o.miembros)) {
    throw new ErrorCuenta('Supabase devolvió una respuesta inesperada. Inténtalo otra vez.');
  }
  return { pareja_id: o.pareja_id, codigo: o.codigo, miembros: o.miembros as MiembroPareja[] };
}

/** Mi pareja (con su código y miembros), o null si todavía no tengo. */
export async function getPareja(cliente: ClienteCuentas): Promise<ParejaInfo | null> {
  const { data } = await llamar(() => cliente.rpc('mi_pareja'));
  return comoPareja(data);
}

async function rpcYRefrescar(
  cliente: ClienteCuentas,
  nombre: 'crear_pareja' | 'unir_pareja',
  argumentos: Record<string, unknown>,
): Promise<ParejaInfo> {
  await llamar(() => cliente.rpc(nombre, argumentos));
  const pareja = await getPareja(cliente);
  if (!pareja) throw new ErrorCuenta('No se pudo leer la pareja. Inténtalo otra vez.');
  return pareja;
}

export function crearPareja(cliente: ClienteCuentas, nombre: string): Promise<ParejaInfo> {
  return rpcYRefrescar(cliente, 'crear_pareja', { p_nombre: nombre });
}

export function unirPareja(cliente: ClienteCuentas, codigo: string, nombre: string): Promise<ParejaInfo> {
  return rpcYRefrescar(cliente, 'unir_pareja', { p_codigo: codigo, p_nombre: nombre });
}

export async function cambiarMiNombre(cliente: ClienteCuentas, nombre: string): Promise<ParejaInfo> {
  await llamar(() => cliente.rpc('cambiar_mi_nombre', { p_nombre: nombre }));
  const pareja = await getPareja(cliente);
  if (!pareja) throw new ErrorCuenta('No se pudo leer la pareja. Inténtalo otra vez.');
  return pareja;
}