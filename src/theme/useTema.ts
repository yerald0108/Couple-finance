import { useColorScheme } from 'react-native';
import { useTemaStore } from '../store/useTemaStore';
import { esquemaEfectivo, temaDe, type Tema } from './temas';

/** El tema que se ve ahora: el modo elegido, y si es automático, el del teléfono. Cambia solo cuando cambia alguno de los dos. */
export function useTema(): Tema {
  const modo = useTemaStore((s) => s.modo);
  const sistema = useColorScheme();
  return temaDe(esquemaEfectivo(modo, sistema === 'dark'));
}

// Los estilos de cada componente se crean una vez por modo y se reutilizan (no una vez por cada fila de una lista).
const cache = new WeakMap<object, Map<Tema, unknown>>();

/**
 * Estilos que dependen del tema. `crear` se define a nivel de módulo (fuera del componente):
 *
 *   const crearEstilos = ({ colors }: Tema) => StyleSheet.create({ caja: { backgroundColor: colors.surface } });
 *   const styles = useEstilos(crearEstilos);
 */
export function useEstilos<T>(crear: (tema: Tema) => T): T {
  const tema = useTema();
  let porTema = cache.get(crear);
  if (!porTema) {
    porTema = new Map();
    cache.set(crear, porTema);
  }
  if (!porTema.has(tema)) porTema.set(tema, crear(tema));
  return porTema.get(tema) as T;
}