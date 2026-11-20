import { useStore } from 'zustand';
import { supabase } from '../lib/supabase';
import { crearSyncStore, type SyncState } from './syncStore';

/** Store único de la sincronización, conectado al cliente real de Supabase (o a null si no está configurado). */
export const syncStore = crearSyncStore(supabase);

export function useSyncStore<T>(selector: (estado: SyncState) => T): T {
  return useStore(syncStore, selector);
}