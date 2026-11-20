import { useStore } from 'zustand';
import { supabase } from '../lib/supabase';
import { crearSesionStore, type SesionState } from './sesionStore';

/** Store único de la app, conectado al cliente real de Supabase (o a null si no está configurado). */
export const sesionStore = crearSesionStore(supabase);

export function useSesionStore<T>(selector: (estado: SesionState) => T): T {
  return useStore(sesionStore, selector);
}