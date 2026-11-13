import type { SQLiteDatabase } from 'expo-sqlite';

/** Lo disponible en un sector. Pesos (efectivo + transferencia) y USD van separados. */
export interface SaldoSector {
  sector_id: string;
  cup: number;
  usd: number;
}

/**
 * Saldo disponible de cada sector = lo que se le repartió en los ingresos
 * MENOS lo que se gastó desde él. Se calcula de los movimientos (no se guarda aparte),
 * así nunca se desajusta.
 */
export async function getSaldosSectores(db: SQLiteDatabase): Promise<SaldoSector[]> {
  return db.getAllAsync<SaldoSector>(
    `SELECT s.id AS sector_id,
            ROUND(COALESCE(SUM(CASE WHEN x.moneda = 'CUP' THEN x.monto END), 0), 2) AS cup,
            ROUND(COALESCE(SUM(CASE WHEN x.moneda = 'USD' THEN x.monto END), 0), 2) AS usd
       FROM sectores s
       LEFT JOIN (
         SELECT r.sector_id AS sector_id,
                CASE WHEN m.forma = 'usd' THEN 'USD' ELSE 'CUP' END AS moneda,
                r.monto AS monto
           FROM repartos r
           JOIN movimientos m ON m.id = r.movimiento_id
          WHERE r.deleted_at IS NULL AND m.deleted_at IS NULL
         UNION ALL
         SELECT m.sector_id,
                CASE WHEN m.forma = 'usd' THEN 'USD' ELSE 'CUP' END,
                -m.monto
           FROM movimientos m
          WHERE m.deleted_at IS NULL AND m.tipo <> 'ingreso'
       ) x ON x.sector_id = s.id
      WHERE s.deleted_at IS NULL AND s.activo = 1
      GROUP BY s.id
      ORDER BY s.orden ASC, s.created_at ASC`,
  );
}

/** Saldo de un solo sector (0 y 0 si no tiene movimientos). */
export async function getSaldoSector(db: SQLiteDatabase, sectorId: string): Promise<SaldoSector> {
  const todos = await getSaldosSectores(db);
  return todos.find((s) => s.sector_id === sectorId) ?? { sector_id: sectorId, cup: 0, usd: 0 };
}