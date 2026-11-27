/**
 * Cuándo mostrar un esqueleto de carga.
 *
 * Los datos están en el teléfono y casi siempre cargan en pocos milisegundos. Un esqueleto que aparece
 * 50 ms y desaparece se ve como un parpadeo, peor que no mostrar nada. Por eso:
 *  - solo se muestra si la carga tarda más de `retardoMs` (150 ms);
 *  - una vez que aparece, se queda como mínimo `minimoMs` (300 ms).
 *
 * Es lógica pura (sin React) para poder probarla; el hook `useEsqueleto` la envuelve.
 */

export const RETARDO_ESQUELETO_MS = 150;
export const MINIMO_ESQUELETO_MS = 300;

/**
 *  - `espera`: está cargando, pero aún no toca mostrar el esqueleto (no se dibuja nada nuevo).
 *  - `esqueleto`: hay que dibujar el esqueleto.
 *  - `listo`: ya no está cargando; se dibuja el contenido.
 */
export type EstadoCarga = 'espera' | 'esqueleto' | 'listo';

export interface OpcionesControlEsqueleto {
  alCambiar: (estado: EstadoCarga) => void;
  retardoMs?: number;
  minimoMs?: number;
  /** Para pruebas. */
  ahora?: () => number;
}

export interface ControlEsqueleto {
  /** Avisa de que empezó (true) o terminó (false) una carga. Repetir el mismo valor no hace nada. */
  fijarCargando: (cargando: boolean) => void;
  estado: () => EstadoCarga;
  /** Cancela los temporizadores pendientes; después ya no avisa de nada. */
  detener: () => void;
}

export function crearControlEsqueleto(opciones: OpcionesControlEsqueleto): ControlEsqueleto {
  const retardo = opciones.retardoMs ?? RETARDO_ESQUELETO_MS;
  const minimo = opciones.minimoMs ?? MINIMO_ESQUELETO_MS;
  const ahora = opciones.ahora ?? Date.now;

  let estado: EstadoCarga = 'listo';
  let cargando = false;
  let detenido = false;
  let visibleDesde = 0;
  let temporizador: ReturnType<typeof setTimeout> | null = null;

  function limpiar() {
    if (temporizador !== null) clearTimeout(temporizador);
    temporizador = null;
  }

  function cambiar(nuevo: EstadoCarga) {
    if (detenido || estado === nuevo) return;
    estado = nuevo;
    opciones.alCambiar(nuevo);
  }

  return {
    fijarCargando(valor) {
      if (detenido || valor === cargando) return;
      cargando = valor;
      limpiar();

      if (valor) {
        // Si el esqueleto ya se estaba mostrando (volvió a cargar durante el tiempo mínimo), sigue igual.
        if (estado === 'esqueleto') return;
        cambiar('espera');
        temporizador = setTimeout(() => {
          temporizador = null;
          if (!cargando) return;
          visibleDesde = ahora();
          cambiar('esqueleto');
        }, retardo);
        return;
      }

      if (estado !== 'esqueleto') {
        cambiar('listo');
        return;
      }
      const falta = visibleDesde + minimo - ahora();
      if (falta <= 0) {
        cambiar('listo');
        return;
      }
      temporizador = setTimeout(() => {
        temporizador = null;
        if (!cargando) cambiar('listo');
      }, falta);
    },
    estado: () => estado,
    detener() {
      detenido = true;
      limpiar();
    },
  };
}