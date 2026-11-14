import { Alert } from 'react-native';

interface OpcionesConfirmar {
  titulo: string;
  mensaje: string;
  /** Texto del botón que confirma ("Eliminar", "Guardar de todos modos"…). */
  textoConfirmar: string;
  textoCancelar?: string;
  /** true = el botón de confirmar se muestra como acción peligrosa (en rojo en iPhone). */
  destructivo?: boolean;
}

/** Pregunta con dos botones. Devuelve true si la persona confirma y false si cancela o cierra el aviso. */
export function confirmar({
  titulo,
  mensaje,
  textoConfirmar,
  textoCancelar = 'Cancelar',
  destructivo = false,
}: OpcionesConfirmar): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      titulo,
      mensaje,
      [
        { text: textoCancelar, style: 'cancel', onPress: () => resolve(false) },
        {
          text: textoConfirmar,
          style: destructivo ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}