import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { sesionStore } from '../../store/useSesionStore';

/**
 * No dibuja nada. Al abrir la app lee la cuenta guardada y la confirma con Supabase en segundo plano
 * (sin bloquear la pantalla), y al volver a la app desde otra la confirma de nuevo.
 * Sin cuenta o sin internet no hace nada más: la app sigue funcionando en local.
 */
export function SesionIniciador() {
  const db = useSQLiteContext();

  useEffect(() => {
    void sesionStore.getState().iniciar(db);

    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active' && sesionStore.getState().usuario) {
        void sesionStore.getState().refrescar(db);
      }
    });
    return () => suscripcion.remove();
  }, [db]);

  return null;
}