import { StyleSheet, View } from 'react-native';
import { useEstilos } from '../../theme/useTema';
import type { Tema } from '../../theme/temas';

/** Línea fina para separar filas dentro de una tarjeta. */
export function Divider() {
  const styles = useEstilos(crearEstilos);
  return <View style={styles.line} />;
}

const crearEstilos = ({ colors }: Tema) => StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});