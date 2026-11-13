import type { SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';
import { getSaldosSectores, type SaldoSector } from '../db/queries/saldosSectores';
import { mensajeError } from '../utils/errors';

interface SaldosSectoresState {
  saldos: SaldoSector[];
  /** true solo hasta la primera carga. */
  cargando: boolean;
  error: string | null;
  cargar: (db: SQLiteDatabase) => Promise<void>;
}

/** Lo disponible en cada sector (pesos y USD). Se recarga al guardar ingresos y gastos. */
export const useSaldosSectoresStore = create<SaldosSectoresState>()((set) => ({
  saldos: [],
  cargando: true,
  error: null,
  cargar: async (db) => {
    try {
      const saldos = await getSaldosSectores(db);
      set({ saldos, cargando: false, error: null });
    } catch (e) {
      set({ cargando: false, error: mensajeError(e) });
    }
  },
}));