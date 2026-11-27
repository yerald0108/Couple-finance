import { Appearance } from 'react-native';
import type { ModoTema } from './temas';

/**
 * Avisa al sistema del modo elegido, para que lo de fuera de React Native (los cuadros de aviso, el teclado)
 * use el mismo. Automático = volver a seguir al teléfono.
 */
export function aplicarModoNativo(modo: ModoTema): void {
  try {
    Appearance.setColorScheme(modo === 'claro' ? 'light' : modo === 'oscuro' ? 'dark' : 'auto');
  } catch {
    // Si el sistema no lo permite, la app se ve igual: cada pantalla ya pinta con su propia paleta.
  }
}