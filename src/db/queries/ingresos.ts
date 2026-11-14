import type { SQLiteDatabase } from 'expo-sqlite';
import type { FormaDinero, OrigenIngreso } from '../../types';
import { aCentavos, deCentavos } from '../../utils/montos';
import { newId } from '../../utils/uuid';
import type { Movimiento, Reparto, Sector } from '../schema';
import { getSectores } from './sectores';

export interface RepartoIngreso {
  sector_id: string;
  monto: number;
}

export interface DatosIngreso {
  monto: number;
  forma: FormaDinero;
  origen: OrigenIngreso;
  repartos: RepartoIngreso[];
}

export interface IngresoRegistrado {
  movimiento: Movimiento;
  repartos: Reparto[];
}

/**
 * Comprueba los datos de un ingreso (monto, sectores y que la suma del reparto sea EXACTAMENTE el monto).
 * Lanza un error con el motivo si algo no es válido. Lo usan registrar y editar un ingreso.
 */
export function validarDatosIngreso(
  sectores: Sector[],
  datos: DatosIngreso,
): { montoCentavos: number; sectorIngresos: Sector } {
  const montoCentavos = aCentavos(datos.monto);
  if (!Number.isFinite(datos.monto) || montoCentavos <= 0) {
    throw new Error('El monto del ingreso debe ser mayor que cero.');
  }
  if (datos.repartos.length === 0) {
    throw new Error('Reparte el monto entre al menos un sector.');
  }

  const sectorIngresos = sectores.find((s) => s.tipo === 'ingresos');
  if (!sectorIngresos) {
    throw new Error('No se encontró el sector Ingresos.');
  }

  const vistos = new Set<string>();
  let repartidoCentavos = 0;
  for (const r of datos.repartos) {
    const centavos = aCentavos(r.monto);
    if (!Number.isFinite(r.monto) || centavos <= 0) {
      throw new Error('Cada parte del reparto debe ser mayor que cero.');
    }
    const sector = sectores.find((s) => s.id === r.sector_id);
    if (!sector || sector.tipo === 'ingresos') {
      throw new Error('Uno de los sectores del reparto no existe.');
    }
    if (vistos.has(r.sector_id)) {
      throw new Error('Un sector aparece dos veces en el reparto.');
    }
    vistos.add(r.sector_id);
    repartidoCentavos += centavos;
  }
  if (repartidoCentavos !== montoCentavos) {
    throw new Error('La suma del reparto no es igual al monto del ingreso.');
  }

  return { montoCentavos, sectorIngresos };
}

/**
 * Registra un ingreso. En UNA sola transacción:
 *   1) crea el movimiento (tipo "ingreso", en el sector Ingresos, con fecha y hora),
 *   2) crea un reparto por cada sector que recibe dinero,
 *   3) suma el monto al saldo de la cuenta de esa forma de dinero.
 * Si algo falla, no se guarda nada (ni el movimiento ni el saldo quedan a medias).
 * Todo es local: no usa internet.
 */
export async function registrarIngreso(
  db: SQLiteDatabase,
  datos: DatosIngreso,
): Promise<IngresoRegistrado> {
  // --- Validación de seguridad (la pantalla ya validó, pero la base no se fía) ---
  const sectores = await getSectores(db);
  const { montoCentavos, sectorIngresos } = validarDatosIngreso(sectores, datos);

  // --- Guardado ---
  const ahora = new Date().toISOString();
  const monto = deCentavos(montoCentavos);

  const movimiento: Movimiento = {
    id: newId(),
    tipo: 'ingreso',
    monto,
    forma: datos.forma,
    concepto: null,
    origen: datos.origen,
    sector_id: sectorIngresos.id,
    motivo_ahorro: null,
    es_salida_ahorro: 0,
    fecha: ahora,
    registrado_por: null,
    created_at: ahora,
    updated_at: ahora,
    deleted_at: null,
  };

  const repartos: Reparto[] = datos.repartos.map((r) => ({
    id: newId(),
    movimiento_id: movimiento.id,
    sector_id: r.sector_id,
    monto: deCentavos(aCentavos(r.monto)),
    created_at: ahora,
    updated_at: ahora,
    deleted_at: null,
  }));

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO movimientos
         (id, tipo, monto, forma, concepto, origen, sector_id, motivo_ahorro,
          es_salida_ahorro, fecha, registrado_por, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        movimiento.id,
        movimiento.tipo,
        movimiento.monto,
        movimiento.forma,
        movimiento.concepto,
        movimiento.origen,
        movimiento.sector_id,
        movimiento.motivo_ahorro,
        movimiento.es_salida_ahorro,
        movimiento.fecha,
        movimiento.registrado_por,
        movimiento.created_at,
        movimiento.updated_at,
      ],
    );

    for (const r of repartos) {
      await db.runAsync(
        `INSERT INTO repartos (id, movimiento_id, sector_id, monto, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [r.id, r.movimiento_id, r.sector_id, r.monto, r.created_at, r.updated_at],
      );
    }

    // ROUND(…, 2) evita que los decimales se vayan acumulando error al sumar muchas veces.
    const resultado = await db.runAsync(
      `UPDATE cuentas SET saldo = ROUND(saldo + ?, 2), updated_at = ? WHERE tipo = ?`,
      [monto, ahora, datos.forma],
    );
    if (resultado.changes !== 1) {
      throw new Error('No se encontró la cuenta de esa forma de dinero.');
    }
  });

  return { movimiento, repartos };
}