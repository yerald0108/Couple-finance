import type { SQLiteDatabase } from 'expo-sqlite';
import type { FormaDinero } from '../../types';
import { FORMA_LABEL } from '../../utils/constants';
import { monedaDeForma } from '../../utils/etiquetas';
import { formatMonto } from '../../utils/formatters';
import { limitesTexto } from '../../utils/gastoValidation';
import { aCentavos, deCentavos } from '../../utils/montos';
import { bloqueosGasto, empeoraNegativo } from '../../utils/saldoForma';
import { newId } from '../../utils/uuid';
import type { Movimiento } from '../schema';
import type { DatosGasto } from './gastos';
import { validarDatosIngreso, type DatosIngreso } from './ingresos';
import type { RepartoDetalle } from './listados';
import { getSaldosSectoresPorForma } from './saldosSectores';
import { getSectores } from './sectores';

/**
 * Resultado de editar o eliminar: se guardó, o NO se guardó nada porque el cambio dejaría el dinero de
 * alguna forma (efectivo, transferencia o USD) en negativo. `avisos` explica por qué.
 */
export type ResultadoCambio =
  | { estado: 'guardado' }
  | { estado: 'saldo_insuficiente'; avisos: string[] };

/** Lo que se puede cambiar de un gasto (la fecha y el sector se mantienen). */
export type DatosEdicionGasto = Omit<DatosGasto, 'sector_id'>;

const FORMAS: FormaDinero[] = ['efectivo', 'transferencia', 'usd'];

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

/** Un movimiento (si existe y no está eliminado). */
export async function getMovimiento(db: SQLiteDatabase, id: string): Promise<Movimiento | null> {
  return db.getFirstAsync<Movimiento>(
    'SELECT * FROM movimientos WHERE id = ? AND deleted_at IS NULL',
    [id],
  );
}

/** Un ingreso con su reparto actual, para llenar el formulario de edición. */
export async function getIngreso(
  db: SQLiteDatabase,
  id: string,
): Promise<{ movimiento: Movimiento; repartos: RepartoDetalle[] } | null> {
  const movimiento = await getMovimiento(db, id);
  if (!movimiento || movimiento.tipo !== 'ingreso') return null;

  const repartos = await db.getAllAsync<RepartoDetalle>(
    `SELECT r.sector_id AS sector_id, s.nombre AS sector_nombre, r.monto AS monto
       FROM repartos r
       JOIN sectores s ON s.id = r.sector_id
      WHERE r.movimiento_id = ? AND r.deleted_at IS NULL
      ORDER BY s.orden ASC, s.created_at ASC`,
    [id],
  );
  return { movimiento, repartos };
}

// ---------------------------------------------------------------------------
// Ayudas internas
// ---------------------------------------------------------------------------

/** Saldo (en centavos) de cada sector en cada forma de dinero. Clave: "idSector|forma". */
type SaldosSectorForma = Map<string, number>;
const clave = (sectorId: string, forma: FormaDinero) => `${sectorId}|${forma}`;

async function saldosSectorForma(db: SQLiteDatabase): Promise<SaldosSectorForma> {
  const porSector = await getSaldosSectoresPorForma(db);
  const saldos: SaldosSectorForma = new Map();
  for (const [sectorId, totales] of porSector) {
    for (const forma of FORMAS) saldos.set(clave(sectorId, forma), aCentavos(totales[forma]));
  }
  return saldos;
}

async function saldoCuenta(db: SQLiteDatabase, forma: FormaDinero): Promise<number> {
  const cuenta = await db.getFirstAsync<{ saldo: number }>(
    'SELECT saldo FROM cuentas WHERE tipo = ?',
    [forma],
  );
  return aCentavos(cuenta?.saldo ?? 0);
}

/** Suma (o resta, si es negativo) centavos al saldo de la cuenta de una forma de dinero. */
async function ajustarCuenta(
  db: SQLiteDatabase,
  forma: FormaDinero,
  deltaCentavos: number,
  ahora: string,
): Promise<void> {
  const resultado = await db.runAsync(
    `UPDATE cuentas SET saldo = ROUND(saldo + ?, 2), updated_at = ? WHERE tipo = ?`,
    [deCentavos(deltaCentavos), ahora, forma],
  );
  if (resultado.changes !== 1) {
    throw new Error('No se encontró la cuenta de esa forma de dinero.');
  }
}

async function marcarEliminado(db: SQLiteDatabase, id: string, ahora: string): Promise<void> {
  const resultado = await db.runAsync(
    `UPDATE movimientos SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
    [ahora, ahora, id],
  );
  if (resultado.changes !== 1) {
    throw new Error('Este movimiento no existe o ya fue eliminado.');
  }
}

/**
 * Motivos por los que un cambio de ingreso se rechaza: algún sector o alguna cuenta quedaría en
 * negativo en una forma de dinero y eso empeora lo que había. Lista vacía = se puede.
 */
async function bloqueosPorNegativo(
  db: SQLiteDatabase,
  antes: SaldosSectorForma,
  despues: SaldosSectorForma,
  cambiosCuenta: Map<FormaDinero, number>,
  nombres: Map<string, string>,
  prefijo: string,
): Promise<string[]> {
  const motivos: string[] = [];

  for (const [k, nuevo] of despues) {
    if (!empeoraNegativo(antes.get(k) ?? 0, nuevo)) continue;
    const [sectorId, forma] = k.split('|') as [string, FormaDinero];
    motivos.push(
      `${prefijo} ${nombres.get(sectorId) ?? 'un sector'} quedaría en negativo en ` +
        `${FORMA_LABEL[forma]}: ${formatMonto(deCentavos(nuevo), monedaDeForma(forma))}.`,
    );
  }

  for (const [forma, delta] of cambiosCuenta) {
    const actual = await saldoCuenta(db, forma);
    const nuevo = actual + delta;
    if (!empeoraNegativo(actual, nuevo)) continue;
    motivos.push(
      `${prefijo} tu saldo en ${FORMA_LABEL[forma]} quedaría en negativo: ` +
        `${formatMonto(deCentavos(nuevo), monedaDeForma(forma))}.`,
    );
  }

  return motivos;
}

function copiar(saldos: SaldosSectorForma): SaldosSectorForma {
  return new Map(saldos);
}

function mover(saldos: SaldosSectorForma, sectorId: string, forma: FormaDinero, delta: number) {
  saldos.set(clave(sectorId, forma), (saldos.get(clave(sectorId, forma)) ?? 0) + delta);
}

// ---------------------------------------------------------------------------
// Eliminar
// ---------------------------------------------------------------------------

/**
 * Elimina un movimiento (borrado suave: deja de contar, pero queda guardado) y recalcula saldos.
 * - Gasto o salida de ahorro: el dinero vuelve a su cuenta y a su sector.
 * - Ingreso: se quita el dinero de su cuenta y se eliminan sus repartos. Si eso dejara algún sector o
 *   cuenta en negativo en esa forma de dinero (porque ya se gastó), NO elimina y devuelve los motivos.
 * Todo ocurre en una sola transacción.
 */
export async function eliminarMovimiento(db: SQLiteDatabase, id: string): Promise<ResultadoCambio> {
  const mov = await getMovimiento(db, id);
  if (!mov) throw new Error('Este movimiento no existe o ya fue eliminado.');

  const monto = aCentavos(mov.monto);
  const ahora = new Date().toISOString();

  if (mov.tipo !== 'ingreso') {
    await db.withTransactionAsync(async () => {
      await marcarEliminado(db, mov.id, ahora);
      await ajustarCuenta(db, mov.forma, monto, ahora);
    });
    return { estado: 'guardado' };
  }

  const ingreso = await getIngreso(db, id);
  const antes = await saldosSectorForma(db);
  const despues = copiar(antes);
  const nombres = new Map<string, string>();
  for (const r of ingreso?.repartos ?? []) {
    nombres.set(r.sector_id, r.sector_nombre);
    mover(despues, r.sector_id, mov.forma, -aCentavos(r.monto));
  }

  const avisos = await bloqueosPorNegativo(
    db,
    antes,
    despues,
    new Map([[mov.forma, -monto]]),
    nombres,
    'No se puede eliminar este ingreso:',
  );
  if (avisos.length > 0) return { estado: 'saldo_insuficiente', avisos };

  await db.withTransactionAsync(async () => {
    await marcarEliminado(db, mov.id, ahora);
    await db.runAsync(
      `UPDATE repartos SET deleted_at = ?, updated_at = ?
        WHERE movimiento_id = ? AND deleted_at IS NULL`,
      [ahora, ahora, mov.id],
    );
    await ajustarCuenta(db, mov.forma, -monto, ahora);
  });
  return { estado: 'guardado' };
}

// ---------------------------------------------------------------------------
// Editar un gasto
// ---------------------------------------------------------------------------

/**
 * Cambia monto, forma de dinero y concepto (o motivo, si es una salida de ahorro) de un gasto.
 * La fecha, la hora y el sector se mantienen. Devuelve al saldo anterior lo que ya se había descontado
 * y descuenta lo nuevo, todo en una transacción. Si lo nuevo no alcanza en esa forma de dinero (cuenta
 * o sector), NO guarda y devuelve los motivos.
 */
export async function editarGasto(
  db: SQLiteDatabase,
  id: string,
  datos: DatosEdicionGasto,
): Promise<ResultadoCambio> {
  const nuevoCentavos = aCentavos(datos.monto);
  if (!Number.isFinite(datos.monto) || nuevoCentavos <= 0) {
    throw new Error('El monto del gasto debe ser mayor que cero.');
  }

  const mov = await getMovimiento(db, id);
  if (!mov) throw new Error('Este movimiento no existe o ya fue eliminado.');
  if (mov.tipo === 'ingreso') throw new Error('Un ingreso se edita desde su propio formulario.');

  const sectores = await getSectores(db);
  const sector = sectores.find((s) => s.id === mov.sector_id);
  if (!sector) throw new Error('El sector de este gasto ya no existe.');
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

  const viejoCentavos = aCentavos(mov.monto);

  // Lo que el gasto ya había descontado vuelve antes de comparar, pero solo en su misma forma de dinero.
  const saldos = await saldosSectorForma(db);
  const avisos = bloqueosGasto({
    montoCentavos: nuevoCentavos,
    forma: datos.forma,
    sectorNombre: sector.nombre,
    cuentaCentavos: await saldoCuenta(db, datos.forma),
    sectorCentavos: saldos.get(clave(sector.id, datos.forma)) ?? 0,
    devueltoCentavos: mov.forma === datos.forma ? viejoCentavos : 0,
  });
  if (avisos.length > 0) return { estado: 'saldo_insuficiente', avisos };

  const ahora = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    const resultado = await db.runAsync(
      `UPDATE movimientos
          SET monto = ?, forma = ?, concepto = ?, motivo_ahorro = ?, updated_at = ?
        WHERE id = ? AND deleted_at IS NULL`,
      [
        deCentavos(nuevoCentavos),
        datos.forma,
        esAhorro ? null : texto,
        esAhorro ? texto : null,
        ahora,
        id,
      ],
    );
    if (resultado.changes !== 1) {
      throw new Error('Este movimiento no existe o ya fue eliminado.');
    }
    await ajustarCuenta(db, mov.forma, viejoCentavos, ahora);
    await ajustarCuenta(db, datos.forma, -nuevoCentavos, ahora);
  });
  return { estado: 'guardado' };
}

// ---------------------------------------------------------------------------
// Editar un ingreso
// ---------------------------------------------------------------------------

/**
 * Cambia monto, forma de dinero, origen y reparto de un ingreso (la fecha y la hora se mantienen).
 * Las mismas reglas que al registrarlo: la suma del reparto debe ser exactamente el monto.
 * Quita lo que el ingreso había sumado y suma lo nuevo, todo en una transacción. Si el cambio dejara
 * algún sector o cuenta en negativo en una forma de dinero, NO guarda y devuelve los motivos.
 */
export async function editarIngreso(
  db: SQLiteDatabase,
  id: string,
  datos: DatosIngreso,
): Promise<ResultadoCambio> {
  const sectores = await getSectores(db);
  const { montoCentavos: nuevoCentavos } = validarDatosIngreso(sectores, datos);

  const actual = await getIngreso(db, id);
  if (!actual) throw new Error('Este ingreso no existe o ya fue eliminado.');
  const { movimiento: mov, repartos: viejos } = actual;
  const viejoCentavos = aCentavos(mov.monto);

  const antes = await saldosSectorForma(db);
  const despues = copiar(antes);
  for (const r of viejos) mover(despues, r.sector_id, mov.forma, -aCentavos(r.monto));
  for (const r of datos.repartos) mover(despues, r.sector_id, datos.forma, aCentavos(r.monto));

  const nombres = new Map(sectores.map((s) => [s.id, s.nombre]));
  const cambiosCuenta = new Map<FormaDinero, number>();
  cambiosCuenta.set(mov.forma, (cambiosCuenta.get(mov.forma) ?? 0) - viejoCentavos);
  cambiosCuenta.set(datos.forma, (cambiosCuenta.get(datos.forma) ?? 0) + nuevoCentavos);

  const avisos = await bloqueosPorNegativo(
    db,
    antes,
    despues,
    cambiosCuenta,
    nombres,
    'No se puede guardar este cambio:',
  );
  if (avisos.length > 0) return { estado: 'saldo_insuficiente', avisos };

  const ahora = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    const resultado = await db.runAsync(
      `UPDATE movimientos SET monto = ?, forma = ?, origen = ?, updated_at = ?
        WHERE id = ? AND tipo = 'ingreso' AND deleted_at IS NULL`,
      [deCentavos(nuevoCentavos), datos.forma, datos.origen, ahora, id],
    );
    if (resultado.changes !== 1) {
      throw new Error('Este ingreso no existe o ya fue eliminado.');
    }

    // El reparto viejo se marca como eliminado y se crea el nuevo.
    await db.runAsync(
      `UPDATE repartos SET deleted_at = ?, updated_at = ?
        WHERE movimiento_id = ? AND deleted_at IS NULL`,
      [ahora, ahora, id],
    );
    for (const r of datos.repartos) {
      await db.runAsync(
        `INSERT INTO repartos (id, movimiento_id, sector_id, monto, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newId(), id, r.sector_id, deCentavos(aCentavos(r.monto)), ahora, ahora],
      );
    }

    await ajustarCuenta(db, mov.forma, -viejoCentavos, ahora);
    await ajustarCuenta(db, datos.forma, nuevoCentavos, ahora);
  });
  return { estado: 'guardado' };
}