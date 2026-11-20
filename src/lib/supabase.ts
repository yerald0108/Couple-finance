/**
 * Cliente de Supabase. Si no hay dirección y llave en las variables de entorno (archivo .env),
 * `supabase` es null y la app funciona 100 % en local, como en las fases 1 a 7.
 */
import 'expo-sqlite/localStorage/install';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { leerConfigSupabase } from '../utils/cuentaValidation';

// Expo solo reemplaza estas variables si se escriben con este formato exacto (process.env.NOMBRE).
const config = leerConfigSupabase(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

function crearCliente() {
  if (!config) return null;
  try {
    return createClient(config.url, config.llave, {
      auth: {
        // La sesión se guarda en el propio SQLite del teléfono y sobrevive al cerrar la app.
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  } catch {
    return null;
  }
}

export const supabase = crearCliente();
export const supabaseConfigurado = supabase !== null;

// Renovar el acceso solo mientras la app está abierta (ahorra batería y datos).
if (supabase) {
  const renovarSegunEstado = (estado: string | null | undefined) => {
    if (estado === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  };
  renovarSegunEstado(AppState.currentState);
  AppState.addEventListener('change', renovarSegunEstado);
}