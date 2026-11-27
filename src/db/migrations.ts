import type { SQLiteDatabase } from 'expo-sqlite';
import { SCHEMA_V3 } from '../sync/syncSql';
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
  {
    // Limpieza (sin cambios de tablas): una prueba de la Fase 7 guardaba "persona_1" / "persona_2" en los
    // movimientos y un perfil en `ajustes`. Se descartó: quién registra cada movimiento se decidirá en la
    // Fase 8 con cuentas. Esto deja esos datos como antes (registrado_por vacío) y corre una sola vez.
    version: 2,
    up: async (db) => {
      await db.runAsync(
        `UPDATE movimientos SET registrado_por = NULL WHERE registrado_por IN ('persona_1', 'persona_2')`,
      );
      await db.runAsync(
        `DELETE FROM ajustes WHERE clave IN ('persona_local', 'nombre_persona_1', 'nombre_persona_2')`,
      );
    },
  },
  {
    // Fase 8B: cola de cambios pendientes y disparadores para sincronizar con la pareja.
    // No cambia ninguna tabla existente; sin la sincronización activada no hace nada.
    version: 3,
    up: async (db) => {
      await db.execAsync(SCHEMA_V3);
    },
  },
  {
    // Rendimiento: dos índices en `movimientos`, medidos con años de datos (ver README, sección 7.7).
    //  - (sector_id, fecha): el historial de Ahorro y los gastos de un sector salen ya ordenados por fecha, sin
    //    ordenar todo el sector cada vez. Sustituye a `idx_movimientos_sector`, que queda cubierto (mismo prefijo).
    //  - (created_at): las notificaciones leen los 50 más recientes sin ordenar todos los movimientos.
    // Solo cambia cómo se buscan los datos; no se toca ningún dato ni ninguna tabla.
    version: 4,
    up: async (db) => {
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_movimientos_sector_fecha ON movimientos(sector_id, fecha);
        CREATE INDEX IF NOT EXISTS idx_movimientos_creado ON movimientos(created_at);
        DROP INDEX IF EXISTS idx_movimientos_sector;
      `);
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