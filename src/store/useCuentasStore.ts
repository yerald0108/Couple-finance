import type { SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';
import { getCuentas } from '../db/queries/cuentas';
import {
  registrarGasto as registrarGastoDb,
  type DatosGasto,
  type ResultadoGasto,
} from '../db/queries/gastos';
import {
  registrarIngreso as registrarIngresoDb,
  type DatosIngreso,
  type IngresoRegistrado,
} from '../db/queries/ingresos';
import {
  editarGasto as editarGastoDb,
  editarIngreso as editarIngresoDb,
  eliminarMovimiento as eliminarMovimientoDb,
  type DatosEdicionGasto,
  type ResultadoCambio,
} from '../db/queries/movimientos';
import type { Cuenta } from '../db/schema';
import { mensajeError } from '../utils/errors';
import { useSaldosSectoresStore } from './useSaldosSectoresStore';

interface CuentasState {
  cuentas: Cuenta[];
  /** true solo hasta la primera carga; las recargas siguientes no hacen parpadear la pantalla. */
  cargando: boolean;
  error: string | null;
  cargar: (db: SQLiteDatabase) => Promise<void>;
  /**
   * Guarda un ingreso y recarga los saldos al instante.
   * Lanza error (y no cambia nada) si el ingreso no es válido o falla el guardado.
   */
  registrarIngreso: (db: SQLiteDatabase, datos: DatosIngreso) => Promise<IngresoRegistrado>;
  /**
   * Guarda un gasto (o una salida de ahorro) y recarga los saldos al instante.
   * Si no alcanza el dinero de esa forma (cuenta o sector) NO guarda y devuelve los motivos.
   */
  registrarGasto: (db: SQLiteDatabase, datos: DatosGasto) => Promise<ResultadoGasto>;
  /** Edita un gasto o una salida de ahorro y recalcula los saldos. No guarda si no alcanza el dinero. */
  editarGasto: (db: SQLiteDatabase, id: string, datos: DatosEdicionGasto) => Promise<ResultadoCambio>;
  /** Edita un ingreso (monto, forma, origen y reparto) y recalcula los saldos. No guarda si dejaría algo en negativo. */
  editarIngreso: (db: SQLiteDatabase, id: string, datos: DatosIngreso) => Promise<ResultadoCambio>;
  /** Elimina un movimiento (gasto, salida de ahorro o ingreso) y recalcula los saldos. */
  eliminarMovimiento: (db: SQLiteDatabase, id: string) => Promise<ResultadoCambio>;
}

/** Saldos de las 3 cuentas. Las pantallas lo leen y se redibujan solas al cambiar. */
export const useCuentasStore = create<CuentasState>()((set, get) => {
  /** Recarga los saldos de las cuentas y los de cada sector. */
  const refrescar = async (db: SQLiteDatabase) => {
    await get().cargar(db);
    await useSaldosSectoresStore.getState().cargar(db);
  };

  return {
    cuentas: [],
    cargando: true,
    error: null,
    cargar: async (db) => {
      try {
        const cuentas = await getCuentas(db);
        set({ cuentas, cargando: false, error: null });
      } catch (e) {
        set({ cargando: false, error: mensajeError(e) });
      }
    },
    registrarIngreso: async (db, datos) => {
      const resultado = await registrarIngresoDb(db, datos);
      await refrescar(db);
      return resultado;
    },
    registrarGasto: async (db, datos) => {
      const resultado = await registrarGastoDb(db, datos);
      if (resultado.estado === 'guardado') await refrescar(db);
      return resultado;
    },
    editarGasto: async (db, id, datos) => {
      const resultado = await editarGastoDb(db, id, datos);
      if (resultado.estado === 'guardado') await refrescar(db);
      return resultado;
    },
    editarIngreso: async (db, id, datos) => {
      const resultado = await editarIngresoDb(db, id, datos);
      if (resultado.estado === 'guardado') await refrescar(db);
      return resultado;
    },
    eliminarMovimiento: async (db, id) => {
      const resultado = await eliminarMovimientoDb(db, id);
      if (resultado.estado === 'guardado') await refrescar(db);
      return resultado;
    },
  };
});