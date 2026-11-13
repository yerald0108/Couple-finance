import { useEffect, useState } from 'react';
import { Keyboard, type KeyboardEvent } from 'react-native';

/**
 * Altura actual del teclado (0 si está cerrado). Se usa para dejar espacio al final
 * de los formularios y poder desplazarse hasta el último campo con el teclado abierto.
 */
export function useKeyboardHeight(): number {
  const [altura, setAltura] = useState(0);

  useEffect(() => {
    const mostrar = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) =>
      setAltura(e.endCoordinates.height),
    );
    const ocultar = Keyboard.addListener('keyboardDidHide', () => setAltura(0));
    return () => {
      mostrar.remove();
      ocultar.remove();
    };
  }, []);

  return altura;
}