import type { ReactNode } from 'react';
import { Pressable } from 'react-native';

interface FilaPulsableProps {
  /** Si no se pasa, la fila se muestra tal cual (sin poder tocarse). */
  onPress?: () => void;
  /** Lo que lee el lector de pantalla al enfocar la fila. */
  etiqueta?: string;
  children: ReactNode;
}

/** Envuelve una fila de una lista para que se pueda tocar (por ejemplo, para editarla). */
export function FilaPulsable({ onPress, etiqueta, children }: FilaPulsableProps) {
  if (!onPress) return <>{children}</>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityHint="Toca para editar o eliminar"
      style={({ pressed }) => (pressed ? { opacity: 0.6 } : undefined)}
    >
      {children}
    </Pressable>
  );
}