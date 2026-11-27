import type { SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';
import { getCierrePendiente, marcarCierreVisto, type CierrePendiente } from '../db/queries/cierreMes';

interface CierreState {
  /** El cierre del mes pasado, si todavía no se vio en este teléfono. */
  pendiente: CierrePendiente | null;
  /** true cuando ya se leyó una vez (para no mostrar Inicio a medias y que luego aparezca la tarjeta). */
  cargado: boolean;
  /** Lee de la base local si hay un cierre por ver. Si falla, simplemente no hay aviso. */
  cargar: (db: SQLiteDatabase) => Promise<void>;
  /** Marca el cierre de `clave` (y los anteriores) como visto y quita el aviso. */
  marcarVisto: (db: SQLiteDatabase, clave: string) => Promise<void>;
}

export const useCierreStore = create<CierreState>()((set, get) => ({
  pendiente: null,
  cargado: false,
  cargar: async (db) => {
    try {
      set({ pendiente: await getCierrePendiente(db), cargado: true });
    } catch {
      set({ pendiente: null, cargado: true });
    }
  },
  marcarVisto: async (db, clave) => {
    try {
      await marcarCierreVisto(db, clave);
    } catch {
      // si no se pudo guardar, el aviso volverá a aparecer la próxima vez; no es grave
    }
    const { pendiente } = get();
    if (pendiente && pendiente.clave <= clave) set({ pendiente: null });
  },
}));