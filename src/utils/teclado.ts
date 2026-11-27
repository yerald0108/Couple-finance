export interface MedidasCampo {
  /** Borde superior del campo (coordenadas de la ventana). */
  campoArriba: number;
  /** Borde inferior del campo. */
  campoAbajo: number;
  /** Borde superior de la zona de la pantalla que se ve (donde empieza el scroll). */
  visibleArriba: number;
  /** Borde inferior de la zona que se ve: lo que quede más arriba entre el final del scroll y el inicio del teclado. */
  visibleAbajo: number;
  /** Aire que se deja entre el campo y el borde (para que no quede pegado al teclado). */
  margen: number;
}

/** Diferencias de hasta estos píxeles se consideran redondeo, no un teclado tapando contenido. */
const TOLERANCIA_SOLAPE = 2;

/**
 * Cuánto del final de la zona con scroll queda debajo del teclado (0 si el teléfono ya achicó la ventana
 * y el scroll termina justo donde empieza el teclado). Ese es el espacio que hay que añadir al final del contenido
 * para poder llegar al último campo: ni más (sobraría hueco tras el último botón) ni menos (quedaría tapado).
 */
export function solapeConTeclado(scrollAbajo: number, tecladoArriba: number): number {
  const solape = scrollAbajo - tecladoArriba;
  return solape > TOLERANCIA_SOLAPE ? Math.round(solape) : 0;
}

/**
 * Cuánto hay que desplazar el scroll para que el campo enfocado se vea completo.
 * Positivo = bajar el contenido (el campo está tapado por el teclado); negativo = subirlo; 0 = ya se ve.
 * Si el campo es más alto que la zona visible, manda su parte de arriba.
 */
export function desplazamientoParaVer({
  campoArriba,
  campoAbajo,
  visibleArriba,
  visibleAbajo,
  margen,
}: MedidasCampo): number {
  let delta = 0;
  if (campoAbajo + margen > visibleAbajo) delta = campoAbajo + margen - visibleAbajo;
  if (campoArriba - delta - margen < visibleArriba) delta = campoArriba - margen - visibleArriba;
  return Math.round(delta);
}