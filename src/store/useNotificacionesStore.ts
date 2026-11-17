import type { SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';
import { getNotificaciones, marcarVistas, type Notificacion } from '../db/queries/notificaciones';
import { mensajeError } from '../utils/errors';

interface NotificacionesState {
  items: Notificacion[];
  /** Cuántos movimientos nuevos de la pareja hay (lo que muestra la campana de Inicio). */
  noLeidas: number;
  /** Hasta dónde llegaba lo que se leyó (para marcar como vistas solo esas). */
  hastaRowid: number;
  /** true solo hasta la primera carga. */
  cargando: boolean;
  error: string | null;
  /** Lee la lista y el número de nuevas desde la base local. */
  cargar: (db: SQLiteDatabase, yoId: string | null) => Promise<void>;
  /** Marca como visto lo que se leyó en la última carga (la campana vuelve a cero). La lista conserva sus marcas de "nuevo". */
  marcarVistas: (db: SQLiteDatabase) => Promise<void>;
}

export const useNotificacionesStore = create<NotificacionesState>()((set) => ({
  items: [],
  noLeidas: 0,
  hastaRowid: 0,
  cargando: true,
  error: null,
  cargar: async (db, yoId) => {
    try {
      const { items, noLeidas, hastaRowid } = await getNotificaciones(db, yoId);
      set({ items, noLeidas, hastaRowid, cargando: false, error: null });
    } catch (e) {
      set({ cargando: false, error: mensajeError(e) });
    }
  },
  marcarVistas: async (db) => {
    try {
      await marcarVistas(db, useNotificacionesStore.getState().hastaRowid);
      set({ noLeidas: 0 });
    } catch (e) {
      set({ error: mensajeError(e) });
    }
  },
}));