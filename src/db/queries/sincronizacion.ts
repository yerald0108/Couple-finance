import type { SQLiteDatabase } from 'expo-sqlite';
import type { ParejaInfo, UsuarioCuenta } from '../../lib/cuentaService';

/**
 * Copia en el teléfono de "quién soy" y "quién es mi pareja", guardada en la tabla `ajustes`.
 * Sirve para mostrar la cuenta sin internet. Es solo de este teléfono: no se sincroniza.
 */
const CLAVE_CUENTA = 'sync_cuenta';
const CLAVE_PAREJA = 'sync_pareja';

async function leerJson(db: SQLiteDatabase, clave: string): Promise<unknown> {
  const fila = await db.getFirstAsync<{ valor: string }>('SELECT valor FROM ajustes WHERE clave = ?', [clave]);
  if (!fila) return null;
  try {
    return JSON.parse(fila.valor);
  } catch {
    return null; // dato dañado: se trata como si no existiera
  }
}

async function guardarJson(db: SQLiteDatabase, clave: string, valor: unknown): Promise<void> {
  if (valor === null) {
    await db.runAsync('DELETE FROM ajustes WHERE clave = ?', [clave]);
    return;
  }
  await db.runAsync(
    `INSERT INTO ajustes (clave, valor, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, updated_at = excluded.updated_at`,
    [clave, JSON.stringify(valor), new Date().toISOString()],
  );
}

function esUsuario(v: unknown): v is UsuarioCuenta {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === 'string' && o.id !== '' && (o.email === null || typeof o.email === 'string');
}

function esPareja(v: unknown): v is ParejaInfo {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.pareja_id === 'string' &&
    typeof o.codigo === 'string' &&
    Array.isArray(o.miembros) &&
    o.miembros.every((m) => {
      if (typeof m !== 'object' || m === null) return false;
      const x = m as Record<string, unknown>;
      return typeof x.user_id === 'string' && typeof x.nombre === 'string' && typeof x.soy_yo === 'boolean';
    })
  );
}

export interface CacheSincronizacion {
  usuario: UsuarioCuenta | null;
  pareja: ParejaInfo | null;
}

export async function leerCacheSincronizacion(db: SQLiteDatabase): Promise<CacheSincronizacion> {
  const usuario = await leerJson(db, CLAVE_CUENTA);
  const pareja = await leerJson(db, CLAVE_PAREJA);
  // La pareja solo tiene sentido si hay cuenta.
  const u = esUsuario(usuario) ? usuario : null;
  return { usuario: u, pareja: u && esPareja(pareja) ? pareja : null };
}

export async function guardarUsuarioCache(db: SQLiteDatabase, usuario: UsuarioCuenta | null): Promise<void> {
  await guardarJson(db, CLAVE_CUENTA, usuario);
}

export async function guardarParejaCache(db: SQLiteDatabase, pareja: ParejaInfo | null): Promise<void> {
  await guardarJson(db, CLAVE_PAREJA, pareja);
}

/** Al cerrar sesión: se olvida la cuenta y la pareja. Los movimientos y saldos NO se tocan. */
export async function limpiarCacheSincronizacion(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM ajustes WHERE clave IN (?, ?)', [CLAVE_CUENTA, CLAVE_PAREJA]);
}