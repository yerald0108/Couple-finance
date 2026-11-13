import type { SQLiteDatabase } from 'expo-sqlite';
import type { FormaDinero } from '../../types';
import { monedaDeForma } from '../../utils/etiquetas';
import {
  avisosSaldoGasto,
  limitesTexto,
  tipoMovimientoDeSector,
} from '../../utils/gastoValidation';
import { aCentavos, deCentavos } from '../../utils/montos';
import { newId } from '../../utils/uuid';
import type { Movimiento } from '../schema';
import { getSaldoSector } from './saldosSectores';
import { getSectores } from './sectores';

export interface DatosGasto {
  sector_id: string;
  monto: number;
  forma: FormaDinero;
  /** Concepto del gasto (arroz, jabón…) o, si el sector es Ahorro, el motivo de la salida. */
  texto: string;
}

export interface OpcionesGasto {
  /** true = guardar aunque supere el saldo (el usuario ya vio el aviso y confirmó). */
  confirmarExceso?: boolean;
}

export type ResultadoGasto =
  | { estado: 'guardado'; movimiento: Movimiento }
  | { estado: 'saldo_insuficiente'; avisos: string[] };

/**
 * Registra un gasto (o una salida de ahorro) y lo descuenta del saldo del sector y de la forma de dinero.
 *
 * - Si supera lo disponible y `confirmarExceso` no es true, NO guarda y devuelve los avisos.
 * - Si algo no es válido (monto, sector, texto), lanza un error y no guarda nada.
 * - El movimiento y el descuento del saldo se hacen en una sola transacción.
 */
export async function registrarGasto(
  db: SQLiteDatabase,
  datos: DatosGasto,
  opciones: OpcionesGasto = {},
): Promise<ResultadoGasto> {
  const montoCentavos = aCentavos(datos.monto);
  if (!Number.isFinite(datos.monto) || montoCentavos <= 0) {
    throw new Error('El monto del gasto debe ser mayor que cero.');
  }

  const sectores = await getSectores(db);
  const sector = sectores.find((s) => s.id === datos.sector_id);
  if (!sector) throw new Error('El sector no existe.');
  const tipo = tipoMovimientoDeSector(sector.tipo); // lanza error si es el sector Ingresos
  const esAhorro = sector.tipo === 'ahorro';

  const texto = datos.texto.trim().replace(/\s+/g, ' ');
  const { min, max } = limitesTexto(esAhorro);
  if (texto.length < min) {
    throw new Error(
      esAhorro ? 'Toda salida de ahorro necesita un motivo.' : 'El gasto necesita un concepto.',
    );
  }
  if (texto.length > max) {
    throw new Error(esAhorro ? 'El motivo es demasiado largo.' : 'El concepto es demasiado largo.');
  }

  // Aviso si el gasto supera lo que hay (se puede confirmar y guardar igual).
  if (!opciones.confirmarExceso) {
    const saldoSector = await getSaldoSector(db, sector.id);
    const cuenta = await db.getFirstAsync<{ saldo: number }>(
      'SELECT saldo FROM cuentas WHERE tipo = ?',
      [datos.forma],
    );
    const disponible = monedaDeForma(datos.forma) === 'USD' ? saldoSector.usd : saldoSector.cup;
    const avisos = avisosSaldoGasto({
      montoCentavos,
      forma: datos.forma,
      sectorNombre: sector.nombre,
      disponibleSectorCentavos: aCentavos(disponible),
      saldoCuentaCentavos: aCentavos(cuenta?.saldo ?? 0),
    });
    if (avisos.length > 0) return { estado: 'saldo_insuficiente', avisos };
  }

  const ahora = new Date().toISOString();
  const monto = deCentavos(montoCentavos);
  const movimiento: Movimiento = {
    id: newId(),
    tipo,
    monto,
    forma: datos.forma,
    concepto: esAhorro ? null : texto,
    origen: null,
    sector_id: sector.id,
    motivo_ahorro: esAhorro ? texto : null,
    es_salida_ahorro: esAhorro ? 1 : 0,
    fecha: ahora,
    registrado_por: null,
    created_at: ahora,
    updated_at: ahora,
    deleted_at: null,
  };

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

    const resultado = await db.runAsync(
      `UPDATE cuentas SET saldo = ROUND(saldo - ?, 2), updated_at = ? WHERE tipo = ?`,
      [monto, ahora, datos.forma],
    );
    if (resultado.changes !== 1) {
      throw new Error('No se encontró la cuenta de esa forma de dinero.');
    }
  });

  return { estado: 'guardado', movimiento };
}