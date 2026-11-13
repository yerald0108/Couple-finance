import type { SQLiteDatabase } from 'expo-sqlite';
import { runMigrations } from './migrations';

/** Nombre del archivo SQLite en el teléfono. */
export const DATABASE_NAME = 'finanzas-pareja.db';

/**
 * Se ejecuta una vez al abrir la base (lo llama <SQLiteProvider onInit>).
 * Todo es local: no necesita internet.
 */
export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  // WAL = escrituras más rápidas y seguras; foreign_keys = respeta las relaciones entre tablas.
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await runMigrations(db);
}