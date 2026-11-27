import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { supabase } from '../../lib/supabase';
import { claveSesionSync, sesionSyncDe } from '../../sync/sesionSync';
import { iniciarTiempoReal, type ClienteTiempoReal } from '../../sync/tiempoReal';
import { sesionStore, useSesionStore } from '../../store/useSesionStore';
import { syncStore, useSyncStore } from '../../store/useSyncStore';

/** Cada cuánto se revisa si hay algo que hacer (es una lectura local, no gasta internet). */
const REVISION_MS = 6_000;
/** Aunque no haya cambios propios, se pregunta a Supabase por cambios de la pareja con esta frecuencia. */
const BAJADA_MS = 45_000;
/** Con el tiempo real conectado los avisos llegan solos: la consulta periódica queda como simple respaldo. */
const BAJADA_CON_TIEMPO_REAL_MS = 120_000;
/** Después de un fallo sin internet se vuelve a intentar pronto; con otros fallos se espera cada vez más. */
const REINTENTO_SIN_CONEXION_MS = 15_000;
const REINTENTO_ERROR_MS = 15_000;
const REINTENTO_ERROR_MAX_MS = 5 * 60_000;

/**
 * No dibuja nada. Mantiene la sincronización viva:
 *  - al tener cuenta y pareja, la activa (o pregunta cómo unir los movimientos si hace falta);
 *  - al cerrar sesión, la apaga en este teléfono (los datos locales no se tocan);
 *  - sincroniza al abrir la app, al volver a ella y cada pocos segundos si hay cambios sin enviar;
 *  - sin internet reintenta cada 15 s, y ante otros errores espera cada vez más;
 *  - con la app abierta escucha los cambios de la pareja en tiempo real (Fase 8C) y sincroniza al recibir un
 *    aviso; la consulta periódica sigue como respaldo (más espaciada mientras el tiempo real está conectado).
 */
export function SyncIniciador() {
  const db = useSQLiteContext();
  const configurado = useSesionStore((s) => s.configurado);
  const cargando = useSesionStore((s) => s.cargando);
  const clave = useSesionStore((s) => claveSesionSync(s.usuario, s.pareja));
  const tieneUsuario = useSesionStore((s) => s.usuario !== null);
  const parejaId = useSesionStore((s) => s.pareja?.pareja_id ?? null);
  const activo = useSyncStore((s) => s.activo);
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
        const cadaCuanto = syncStore.getState().tiempoReal === 'conectado' ? BAJADA_CON_TIEMPO_REAL_MS : BAJADA_MS;
        const tocaBajar = ahora - ultimoIntento >= cadaCuanto;
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

  // Tiempo real: escucha a la pareja mientras la app está abierta (en segundo plano se cierra el canal).
  useEffect(() => {
    if (!configurado || !activo || !parejaId || !supabase) return;
    const cliente = supabase as unknown as ClienteTiempoReal;
    let parar: (() => void) | null = null;
    let enCurso = false;
    let repetir = false;

    // Un aviso = sincronizar. Si llegan más avisos mientras se sincroniza, se repite una vez al terminar.
    async function alAviso() {
      if (enCurso) {
        repetir = true;
        return;
      }
      enCurso = true;
      try {
        do {
          repetir = false;
          const s = syncStore.getState();
          if (!s.activo || s.estado === 'decidir') break;
          // Si ya había una sincronización en marcha, pudo haber pasado de largo el cambio nuevo: se hace otra.
          const yaEnMarcha = s.estado === 'sincronizando';
          await s.sincronizar(db);
          if (yaEnMarcha) await syncStore.getState().sincronizar(db);
        } while (repetir);
      } finally {
        enCurso = false;
      }
    }

    function abrir() {
      if (parar) return;
      parar = iniciarTiempoReal(cliente, {
        parejaId: parejaId as string,
        alCambiar: () => void alAviso(),
        alEstado: (e) => syncStore.getState().fijarTiempoReal(e),
      });
    }
    function cerrar() {
      if (!parar) return;
      parar();
      parar = null;
    }

    if (AppState.currentState === 'active') abrir();
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') abrir();
      else cerrar();
    });
    return () => {
      suscripcion.remove();
      cerrar();
    };
  }, [db, configurado, activo, parejaId]);

  return null;
}