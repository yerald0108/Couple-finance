import type { SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';
import { getAjuste, setAjuste } from '../sync/ajustes';
import { aplicarModoNativo } from '../theme/nativo';
import { esModoTema, type ModoTema } from '../theme/temas';

/** Clave en la tabla `ajustes`. Esa tabla es solo de este teléfono: cada uno de la pareja tiene su modo. */
export const CLAVE_TEMA = 'tema';

interface TemaState {
  modo: ModoTema;
  /** Lee el modo guardado (sin nada guardado, o con un valor raro, queda en claro) y lo aplica. */
  cargar: (db: SQLiteDatabase) => Promise<void>;
  /** Cambia el modo al instante y lo guarda. Devuelve false si no se pudo guardar (el cambio vale hasta cerrar la app). */
  cambiar: (db: SQLiteDatabase, modo: ModoTema) => Promise<boolean>;
}

export const useTemaStore = create<TemaState>()((set) => ({
  modo: 'claro',
  cargar: async (db) => {
    try {
      const guardado = await getAjuste(db, CLAVE_TEMA);
      const modo = esModoTema(guardado) ? guardado : 'claro';
      set({ modo });
      aplicarModoNativo(modo);
    } catch {
      // Sin poder leer, la app arranca en claro, como siempre.
    }
  },
  cambiar: async (db, modo) => {
    set({ modo });
    aplicarModoNativo(modo);
    try {
      await setAjuste(db, CLAVE_TEMA, modo);
      return true;
    } catch {
      return false;
    }
  },
}));