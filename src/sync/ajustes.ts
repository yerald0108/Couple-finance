import type { SQLiteDatabase } from 'expo-sqlite';

/** Lectura y escritura de los ajustes de sincronización (tabla `ajustes`, solo de este teléfono). */

export async function getAjuste(db: SQLiteDatabase, clave: string): Promise<string | null> {
  const fila = await db.getFirstAsync<{ valor: string }>('SELECT valor FROM ajustes WHERE clave = ?', [clave]);
  return fila ? fila.valor : null;
}

export async function setAjuste(db: SQLiteDatabase, clave: string, valor: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO ajustes (clave, valor, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, updated_at = excluded.updated_at`,
    [clave, valor, new Date().toISOString()],
  );
}

export async function delAjuste(db: SQLiteDatabase, clave: string): Promise<void> {
  await db.runAsync('DELETE FROM ajustes WHERE clave = ?', [clave]);
}