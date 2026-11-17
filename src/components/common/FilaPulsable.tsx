import type { ReactNode } from 'react';
import { Pressable } from 'react-native';

interface FilaPulsableProps {
  /** Si no se pasa, la fila se muestra tal cual (sin poder tocarse). */
  onPress?: () => void;
  /** Lo que lee el lector de pantalla al enfocar la fila. */
  etiqueta?: string;
  /** Lo que lee el lector de pantalla como pista de lo que pasa al tocar. */
  pista?: string;
  children: ReactNode;
}

/** Envuelve una fila de una lista para que se pueda tocar (por ejemplo, para editarla). */
export function FilaPulsable({ onPress, etiqueta, pista = 'Toca para editar o eliminar', children }: FilaPulsableProps) {
  if (!onPress) return <>{children}</>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityHint={pista}
      style={({ pressed }) => (pressed ? { opacity: 0.6 } : undefined)}
    >
      {children}
    </Pressable>
  );
}