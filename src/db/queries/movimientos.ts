import type { SQLiteDatabase } from 'expo-sqlite';
import type { FormaDinero } from '../../types';
import { FORMA_LABEL } from '../../utils/constants';
import { monedaDeForma } from '../../utils/etiquetas';
import { formatMonto } from '../../utils/formatters';
import { avisosSaldoGasto, limitesTexto } from '../../utils/gastoValidation';
import { aCentavos, deCentavos } from '../../utils/montos';
import { newId } from '../../utils/uuid';
import type { Movimiento } from '../schema';
import type { DatosGasto } from './gastos';
import { validarDatosIngreso, type DatosIngreso } from './ingresos';
import type { RepartoDetalle } from './listados';
import { getSaldosSectores } from './saldosSectores';
import { getSectores } from './sectores';

/** Resultado de editar o eliminar: se guardó, o hace falta que la persona confirme un aviso de saldo. */
export type ResultadoCambio =
  | { estado: 'guardado' }
  | { estado: 'saldo_insuficiente'; avisos: string[] };

export interface OpcionesCambio {
  /** true = guardar aunque deje algún saldo en negativo (la persona ya vio el aviso y confirmó). */
  confirmarExceso?: boolean;
}

/** Lo que se puede cambiar de un gasto (la fecha y el sector se mantienen). */
export type DatosEdicionGasto = Omit<DatosGasto, 'sector_id'>;

type Grupo = 'cup' | 'usd';
const grupoDe = (forma: FormaDinero): Grupo => (forma === 'usd' ? 'usd' : 'cup');

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

type SaldosCentavos = Map<string, Record<Grupo, number>>;

async function saldosPorSector(db: SQLiteDatabase): Promise<SaldosCentavos> {
  const saldos = await getSaldosSectores(db);
  return new Map(
    saldos.map((s) => [s.sector_id, { cup: aCentavos(s.cup), usd: aCentavos(s.usd) }]),
  );
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

/** Saldo que quedaría en cada sector/cuenta; avisa solo de lo que quedaría en negativo y empeora. */
function avisosNegativos(
  antes: SaldosCentavos,
  despues: SaldosCentavos,
  nombres: Map<string, string>,
  frase: string,
): string[] {
  const avisos: string[] = [];
  for (const [id, d] of despues) {
    for (const grupo of ['cup', 'usd'] as const) {
      const previo = antes.get(id)?.[grupo] ?? 0;
      if (d[grupo] < 0 && d[grupo] < previo) {
        avisos.push(
          `${frase} ${nombres.get(id) ?? 'un sector'} quedaría en negativo: ` +
            `${formatMonto(deCentavos(d[grupo]), grupo === 'usd' ? 'USD' : 'CUP')}.`,
        );
      }
    }
  }
  return avisos;
}

async function avisosCuentas(
  db: SQLiteDatabase,
  cambios: Map<FormaDinero, number>,
): Promise<string[]> {
  const avisos: string[] = [];
  for (const [forma, delta] of cambios) {
    const actual = await saldoCuenta(db, forma);
    const nuevo = actual + delta;
    if (nuevo < 0 && nuevo < actual) {
      avisos.push(
        `Tu saldo en ${FORMA_LABEL[forma]} quedaría en negativo: ` +
          `${formatMonto(deCentavos(nuevo), monedaDeForma(forma))}.`,
      );
    }
  }
  return avisos;
}

function sumarAlCambio(cambios: Map<FormaDinero, number>, forma: FormaDinero, centavos: number) {
  cambios.set(forma, (cambios.get(forma) ?? 0) + centavos);
}

// ---------------------------------------------------------------------------
// Eliminar
// ---------------------------------------------------------------------------

/**
 * Elimina un movimiento (borrado suave: deja de contar, pero queda guardado) y recalcula saldos.
 * - Gasto o salida de ahorro: el dinero vuelve a su cuenta y a su sector.
 * - Ingreso: se quita el dinero de su cuenta y se eliminan sus repartos. Si eso dejara algún sector
 *   o cuenta en negativo, NO elimina y devuelve los avisos hasta que se confirme (`confirmarExceso`).
 * Todo ocurre en una sola transacción.
 */
export async function eliminarMovimiento(
  db: SQLiteDatabase,
  id: string,
  opciones: OpcionesCambio = {},
): Promise<ResultadoCambio> {
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

  if (!opciones.confirmarExceso) {
    const ingreso = await getIngreso(db, id);
    const grupo = grupoDe(mov.forma);
    const antes = await saldosPorSector(db);
    const despues: SaldosCentavos = new Map([...antes].map(([k, v]) => [k, { ...v }]));
    const nombres = new Map<string, string>();
    for (const r of ingreso?.repartos ?? []) {
      nombres.set(r.sector_id, r.sector_nombre);
      const actual = despues.get(r.sector_id) ?? { cup: 0, usd: 0 };
      despues.set(r.sector_id, { ...actual, [grupo]: actual[grupo] - aCentavos(r.monto) });
    }

    const avisos = [
      ...avisosNegativos(antes, despues, nombres, 'Si eliminas este ingreso,'),
      ...(await avisosCuentas(db, new Map([[mov.forma, -monto]]))),
    ];
    if (avisos.length > 0) return { estado: 'saldo_insuficiente', avisos };
  }

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
 * y descuenta lo nuevo, todo en una transacción. Si lo nuevo supera lo disponible, avisa sin guardar
 * hasta que se confirme (`confirmarExceso`).
 */
export async function editarGasto(
  db: SQLiteDatabase,
  id: string,
  datos: DatosEdicionGasto,
  opciones: OpcionesCambio = {},
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

  if (!opciones.confirmarExceso) {
    const saldos = await saldosPorSector(db);
    const actual = saldos.get(sector.id) ?? { cup: 0, usd: 0 };
    const grupoNuevo = grupoDe(datos.forma);
    // Lo que ya se había gastado "vuelve" antes de comparar, si es de la misma moneda.
    const devueltoSector = grupoDe(mov.forma) === grupoNuevo ? viejoCentavos : 0;
    const devueltoCuenta = mov.forma === datos.forma ? viejoCentavos : 0;

    const avisos = avisosSaldoGasto({
      montoCentavos: nuevoCentavos,
      forma: datos.forma,
      sectorNombre: sector.nombre,
      disponibleSectorCentavos: actual[grupoNuevo] + devueltoSector,
      saldoCuentaCentavos: (await saldoCuenta(db, datos.forma)) + devueltoCuenta,
    });
    if (avisos.length > 0) return { estado: 'saldo_insuficiente', avisos };
  }

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
 * algún sector o cuenta en negativo, avisa sin guardar hasta que se confirme (`confirmarExceso`).
 */
export async function editarIngreso(
  db: SQLiteDatabase,
  id: string,
  datos: DatosIngreso,
  opciones: OpcionesCambio = {},
): Promise<ResultadoCambio> {
  const sectores = await getSectores(db);
  const { montoCentavos: nuevoCentavos } = validarDatosIngreso(sectores, datos);

  const actual = await getIngreso(db, id);
  if (!actual) throw new Error('Este ingreso no existe o ya fue eliminado.');
  const { movimiento: mov, repartos: viejos } = actual;
  const viejoCentavos = aCentavos(mov.monto);

  if (!opciones.confirmarExceso) {
    const antes = await saldosPorSector(db);
    const despues: SaldosCentavos = new Map([...antes].map(([k, v]) => [k, { ...v }]));
    const mover = (sectorId: string, grupo: Grupo, delta: number) => {
      const s = despues.get(sectorId) ?? { cup: 0, usd: 0 };
      despues.set(sectorId, { ...s, [grupo]: s[grupo] + delta });
    };
    for (const r of viejos) mover(r.sector_id, grupoDe(mov.forma), -aCentavos(r.monto));
    for (const r of datos.repartos) mover(r.sector_id, grupoDe(datos.forma), aCentavos(r.monto));

    const nombres = new Map(sectores.map((s) => [s.id, s.nombre]));
    const cambiosCuenta = new Map<FormaDinero, number>();
    sumarAlCambio(cambiosCuenta, mov.forma, -viejoCentavos);
    sumarAlCambio(cambiosCuenta, datos.forma, nuevoCentavos);

    const avisos = [
      ...avisosNegativos(antes, despues, nombres, 'Con este cambio,'),
      ...(await avisosCuentas(db, cambiosCuenta)),
    ];
    if (avisos.length > 0) return { estado: 'saldo_insuficiente', avisos };
  }

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