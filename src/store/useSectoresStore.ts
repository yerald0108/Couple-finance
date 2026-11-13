import type { SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';
import { crearSector, getSectores } from '../db/queries/sectores';
import type { Sector } from '../db/schema';
import { mensajeError } from '../utils/errors';
import type { EntradaSector } from '../utils/sectorValidation';

interface SectoresState {
  sectores: Sector[];
  cargando: boolean;
  error: string | null;
  cargar: (db: SQLiteDatabase) => Promise<void>;
  /** Crea un sector personalizado y lo añade a la lista al instante. Lanza error si no es válido. */
  agregar: (db: SQLiteDatabase, entrada: EntradaSector) => Promise<Sector>;
}

/** Sectores activos: los 4 base y los que cree el usuario. */
export const useSectoresStore = create<SectoresState>()((set) => ({
  sectores: [],
  cargando: true,
  error: null,
  cargar: async (db) => {
    try {
      const sectores = await getSectores(db);
      set({ sectores, cargando: false, error: null });
    } catch (e) {
      set({ cargando: false, error: mensajeError(e) });
    }
  },
  agregar: async (db, entrada) => {
    const nuevo = await crearSector(db, entrada);
    set((estado) => ({ sectores: [...estado.sectores, nuevo] }));
    return nuevo;
  },
}));