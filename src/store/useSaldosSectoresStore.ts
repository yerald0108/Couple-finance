import type { SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';
import { getTotalIngresosPeriodo } from '../db/queries/listados';
import { getSaldosSectores, type SaldoSector } from '../db/queries/saldosSectores';
import { mensajeError } from '../utils/errors';
import { rangoMes } from '../utils/fechas';

interface SaldosSectoresState {
  saldos: SaldoSector[];
  /** Lo que ha ingresado en el mes actual (pesos y USD aparte). Es lo que muestra la fila de Ingresos en Inicio. */
  ingresosMes: { cup: number; usd: number };
  /** true solo hasta la primera carga. */
  cargando: boolean;
  error: string | null;
  cargar: (db: SQLiteDatabase) => Promise<void>;
}

/** Lo disponible en cada sector (pesos y USD) y los ingresos del mes. Se recarga al guardar, editar o eliminar. */
export const useSaldosSectoresStore = create<SaldosSectoresState>()((set) => ({
  saldos: [],
  ingresosMes: { cup: 0, usd: 0 },
  cargando: true,
  error: null,
  cargar: async (db) => {
    try {
      const [saldos, ingresosMes] = await Promise.all([
        getSaldosSectores(db),
        getTotalIngresosPeriodo(db, rangoMes()),
      ]);
      set({ saldos, ingresosMes, cargando: false, error: null });
    } catch (e) {
      set({ cargando: false, error: mensajeError(e) });
    }
  },
}));