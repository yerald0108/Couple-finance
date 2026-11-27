import { useEffect, useRef, useState } from 'react';
import { crearControlEsqueleto, type ControlEsqueleto, type EstadoCarga } from '../utils/controlEsqueleto';

/**
 * Dice qué dibujar mientras algo carga:
 *  - `'espera'`: todavía no (la carga puede ser instantánea). No dibujes un esqueleto.
 *  - `'esqueleto'`: dibuja el esqueleto.
 *  - `'listo'`: dibuja el contenido.
 *
 * Los tiempos (150 ms de espera, 300 ms mínimos) están en `utils/controlEsqueleto.ts`.
 */
export function useEsqueleto(cargando: boolean): EstadoCarga {
  const [estado, setEstado] = useState<EstadoCarga>(cargando ? 'espera' : 'listo');
  const control = useRef<ControlEsqueleto | null>(null);
  const cargandoActual = useRef(cargando);
  cargandoActual.current = cargando;

  // El control se crea y se destruye en el efecto (así también funciona con el modo estricto de React).
  useEffect(() => {
    const c = crearControlEsqueleto({ alCambiar: setEstado });
    control.current = c;
    c.fijarCargando(cargandoActual.current);
    return () => {
      c.detener();
      control.current = null;
    };
  }, []);

  useEffect(() => {
    control.current?.fijarCargando(cargando);
  }, [cargando]);

  return estado;
}