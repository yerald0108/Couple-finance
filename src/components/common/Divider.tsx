import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme';

/** Línea fina para separar filas dentro de una tarjeta. */
export function Divider() {
  return <View style={styles.line} />;
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});