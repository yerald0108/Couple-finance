import type { SQLiteDatabase } from 'expo-sqlite';
import type { FormaDinero } from '../../types';
import { aCentavos, deCentavos } from '../../utils/montos';
import type { TotalesPorForma } from '../../utils/totales';

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

/**
 * Lo disponible en un sector separado por forma de dinero (efectivo, transferencia y USD).
 * Sale de lo repartido en cada forma menos lo gastado en esa misma forma. Efectivo + transferencia
 * da el mismo total en pesos que `getSaldoSector`. Una forma puede quedar en negativo aunque el total
 * en pesos no lo esté (por ejemplo, si se gastó más en efectivo de lo que se repartió en efectivo).
 */
export async function getSaldoSectorPorForma(
  db: SQLiteDatabase,
  sectorId: string,
): Promise<TotalesPorForma> {
  const filas = await db.getAllAsync<{ forma: FormaDinero; saldo: number }>(
    `SELECT x.forma AS forma, ROUND(SUM(x.monto), 2) AS saldo
       FROM (
         SELECT m.forma AS forma, r.monto AS monto
           FROM repartos r
           JOIN movimientos m ON m.id = r.movimiento_id
          WHERE r.sector_id = ? AND r.deleted_at IS NULL AND m.deleted_at IS NULL
         UNION ALL
         SELECT m.forma, -m.monto
           FROM movimientos m
          WHERE m.sector_id = ? AND m.deleted_at IS NULL AND m.tipo <> 'ingreso'
       ) x
      GROUP BY x.forma`,
    [sectorId, sectorId],
  );

  const centavos: Record<FormaDinero, number> = { efectivo: 0, transferencia: 0, usd: 0 };
  for (const f of filas) centavos[f.forma] = aCentavos(f.saldo);
  return {
    efectivo: deCentavos(centavos.efectivo),
    transferencia: deCentavos(centavos.transferencia),
    usd: deCentavos(centavos.usd),
  };
}