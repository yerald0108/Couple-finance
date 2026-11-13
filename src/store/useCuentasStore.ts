import type { SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';
import { getCuentas } from '../db/queries/cuentas';
import {
  registrarGasto as registrarGastoDb,
  type DatosGasto,
  type OpcionesGasto,
  type ResultadoGasto,
} from '../db/queries/gastos';
import {
  registrarIngreso as registrarIngresoDb,
  type DatosIngreso,
  type IngresoRegistrado,
} from '../db/queries/ingresos';
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
   * Si supera lo disponible devuelve los avisos SIN guardar (hasta que se confirme).
   */
  registrarGasto: (
    db: SQLiteDatabase,
    datos: DatosGasto,
    opciones?: OpcionesGasto,
  ) => Promise<ResultadoGasto>;
}

/** Saldos de las 3 cuentas. Las pantallas lo leen y se redibujan solas al cambiar. */
export const useCuentasStore = create<CuentasState>()((set, get) => ({
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
    await get().cargar(db);
    await useSaldosSectoresStore.getState().cargar(db);
    return resultado;
  },
  registrarGasto: async (db, datos, opciones) => {
    const resultado = await registrarGastoDb(db, datos, opciones);
    if (resultado.estado === 'guardado') {
      await get().cargar(db);
      await useSaldosSectoresStore.getState().cargar(db);
    }
    return resultado;
  },
}));