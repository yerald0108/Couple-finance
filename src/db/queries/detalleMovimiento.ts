import type { SQLiteDatabase } from 'expo-sqlite';
import type { Movimiento } from '../schema';
import { getMovimiento } from './movimientos';
import type { RepartoDetalle } from './listados';

export interface DetalleMovimiento {
  movimiento: Movimiento;
  sector_nombre: string;
  /** Solo en ingresos: cómo se repartió. */
  repartos: RepartoDetalle[];
}

/** Todo lo que muestra la pantalla de detalle de un movimiento. null si no existe o ya se eliminó. */
export async function getDetalleMovimiento(db: SQLiteDatabase, id: string): Promise<DetalleMovimiento | null> {
  const movimiento = await getMovimiento(db, id);
  if (!movimiento) return null;

  const sector = await db.getFirstAsync<{ nombre: string }>('SELECT nombre FROM sectores WHERE id = ?', [
    movimiento.sector_id,
  ]);

  const repartos =
    movimiento.tipo === 'ingreso'
      ? await db.getAllAsync<RepartoDetalle>(
          `SELECT r.sector_id AS sector_id, s.nombre AS sector_nombre, r.monto AS monto
             FROM repartos r
             JOIN sectores s ON s.id = r.sector_id
            WHERE r.movimiento_id = ? AND r.deleted_at IS NULL
            ORDER BY s.orden ASC, s.created_at ASC`,
          [id],
        )
      : [];

  return { movimiento, sector_nombre: sector?.nombre ?? 'Sector', repartos };
}