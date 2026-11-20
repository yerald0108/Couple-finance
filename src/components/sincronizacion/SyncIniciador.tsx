import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { claveSesionSync, sesionSyncDe } from '../../sync/sesionSync';
import { sesionStore, useSesionStore } from '../../store/useSesionStore';
import { syncStore } from '../../store/useSyncStore';

/** Cada cuánto se revisa si hay algo que hacer (es una lectura local, no gasta internet). */
const REVISION_MS = 6_000;
/** Aunque no haya cambios propios, se pregunta a Supabase por cambios de la pareja con esta frecuencia. */
const BAJADA_MS = 45_000;
/** Después de un fallo sin internet se vuelve a intentar pronto; con otros fallos se espera cada vez más. */
const REINTENTO_SIN_CONEXION_MS = 15_000;
const REINTENTO_ERROR_MS = 15_000;
const REINTENTO_ERROR_MAX_MS = 5 * 60_000;

/**
 * No dibuja nada. Mantiene la sincronización viva:
 *  - al tener cuenta y pareja, la activa (o pregunta cómo unir los movimientos si hace falta);
 *  - al cerrar sesión, la apaga en este teléfono (los datos locales no se tocan);
 *  - sincroniza al abrir la app, al volver a ella y cada pocos segundos si hay cambios sin enviar;
 *  - sin internet reintenta cada 15 s, y ante otros errores espera cada vez más.
 */
export function SyncIniciador() {
  const db = useSQLiteContext();
  const configurado = useSesionStore((s) => s.configurado);
  const cargando = useSesionStore((s) => s.cargando);
  const clave = useSesionStore((s) => claveSesionSync(s.usuario, s.pareja));
  const tieneUsuario = useSesionStore((s) => s.usuario !== null);
  const cadena = useRef<Promise<void>>(Promise.resolve());

  // Activar / desactivar, una cosa a la vez (en orden).
  useEffect(() => {
    if (!configurado || cargando) return;
    const { usuario, pareja } = sesionStore.getState();
    const sesion = sesionSyncDe(usuario, pareja);
    cadena.current = cadena.current.then(async () => {
      if (!usuario) {
        await syncStore.getState().desactivar(db);
      } else if (sesion) {
        await syncStore.getState().preparar(db, sesion);
      }
    });
    // `clave` y `tieneUsuario` cambian justo cuando hay que volver a decidir.
  }, [db, configurado, cargando, clave, tieneUsuario]);

  // Revisión periódica y al volver a la app.
  useEffect(() => {
    if (!configurado) return;
    let detenido = false;
    let ocupado = false;
    let ultimoIntento = 0;
    let proximoIntento = 0;
    let fallos = 0;

    async function intentar(forzar: boolean) {
      if (detenido || ocupado) return;
      if (AppState.currentState !== 'active') return;
      const s = syncStore.getState();
      if (!s.activo || s.estado === 'sincronizando' || s.estado === 'decidir') return;

      ocupado = true;
      try {
        await s.leerPendientes(db);
        const ahora = Date.now();
        const hayCambios = syncStore.getState().pendientes > 0;
        const tocaBajar = ahora - ultimoIntento >= BAJADA_MS;
        if (!forzar && ahora < proximoIntento) return;
        if (!forzar && !hayCambios && !tocaBajar) return;

        await syncStore.getState().sincronizar(db);
        ultimoIntento = Date.now();
        const despues = syncStore.getState();
        if (despues.estado === 'ok') {
          fallos = 0;
          proximoIntento = 0;
        } else if (despues.estado === 'sin_conexion') {
          proximoIntento = ultimoIntento + REINTENTO_SIN_CONEXION_MS;
        } else if (despues.estado === 'error') {
          fallos += 1;
          proximoIntento = ultimoIntento + Math.min(REINTENTO_ERROR_MAX_MS, REINTENTO_ERROR_MS * 2 ** (fallos - 1));
        }
      } finally {
        ocupado = false;
      }
    }

    const reloj = setInterval(() => void intentar(false), REVISION_MS);
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') {
        fallos = 0;
        proximoIntento = 0;
        void intentar(true);
      }
    });
    return () => {
      detenido = true;
      clearInterval(reloj);
      suscripcion.remove();
    };
  }, [db, configurado]);

  return null;
}