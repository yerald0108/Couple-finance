import { createContext, useContext } from 'react';

/**
 * `Screen` lo provee: los campos de texto lo llaman al recibir el foco para que la pantalla
 * desplace el scroll y el campo no quede tapado por el teclado. Fuera de `Screen` no hace nada.
 */
export const AlEnfocarContext = createContext<() => void>(() => {});

export function useAlEnfocar(): () => void {
  return useContext(AlEnfocarContext);
}