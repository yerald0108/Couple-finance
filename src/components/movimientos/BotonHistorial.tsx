import { Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { colors, radius } from '../../theme';

/** Botón de la esquina de Movimientos: abre el historial con todos los movimientos de los dos. */
export function BotonHistorial() {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/historial')}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Historial de movimientos"
      accessibilityHint="Abre la lista de todos los movimientos"
      style={({ pressed }) => [styles.boton, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name="time-outline" size={22} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});