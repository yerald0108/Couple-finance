import type { SQLiteDatabase } from 'expo-sqlite';
import type { Cuenta } from '../schema';

/** Las 3 cuentas, siempre en el mismo orden: efectivo, transferencia, USD. */
export async function getCuentas(db: SQLiteDatabase): Promise<Cuenta[]> {
  return db.getAllAsync<Cuenta>(
    `SELECT * FROM cuentas
     ORDER BY CASE tipo WHEN 'efectivo' THEN 0 WHEN 'transferencia' THEN 1 ELSE 2 END`,
  );
}