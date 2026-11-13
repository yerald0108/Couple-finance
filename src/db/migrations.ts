import type { SQLiteDatabase } from 'expo-sqlite';
import { SCHEMA_V1, seedV1 } from './schemaSql';

interface Migration {
  version: number;
  up: (db: SQLiteDatabase) => Promise<void>;
}

/**
 * Lista ordenada de migraciones. Para cambiar la base en el futuro (por ejemplo,
 * añadir columnas para Supabase en la Fase 8) se AÑADE una migración nueva al final;
 * nunca se edita una ya publicada.
 */
const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: async (db) => {
      await db.execAsync(SCHEMA_V1);
      const now = new Date().toISOString();
      for (const stmt of seedV1(now)) {
        await db.runAsync(stmt.sql, stmt.params);
      }
    },
  },
];

/**
 * Aplica las migraciones pendientes. La versión actual se guarda dentro del propio
 * archivo SQLite (PRAGMA user_version), así que funciona sin internet y es idempotente:
 * abrir la app muchas veces no repite nada.
 */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    // Cada migración corre en una transacción: o se aplica completa o no se aplica.
    await db.withTransactionAsync(async () => {
      await migration.up(db);
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }
}