import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fontSizes, fonts, radius, spacing } from '../../theme';
import { useEstilos, useTema } from '../../theme/useTema';
import type { Tema } from '../../theme/temas';

interface NavegadorMesProps {
  /** "Octubre 2026" */
  etiqueta: string;
  onAnterior: () => void;
  onSiguiente: () => void;
  puedeAnterior: boolean;
  /** false cuando ya se está viendo el último mes cerrado (el mes actual no se cierra hasta que termina). */
  puedeSiguiente: boolean;
}

/** Flechas para ir al cierre del mes anterior o al siguiente, con el nombre del mes en el centro. */
export function NavegadorMes({ etiqueta, onAnterior, onSiguiente, puedeAnterior, puedeSiguiente }: NavegadorMesProps) {
  const styles = useEstilos(crearEstilos);
  const { colors } = useTema();
  return (
    <View style={styles.fila}>
      <Pressable
        onPress={onAnterior}
        disabled={!puedeAnterior}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Mes anterior"
        accessibilityState={{ disabled: !puedeAnterior }}
        style={[styles.flecha, !puedeAnterior && styles.flechaOff]}
      >
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>

      <Text style={styles.etiqueta} numberOfLines={1} adjustsFontSizeToFit accessibilityRole="header">
        {etiqueta}
      </Text>

      <Pressable
        onPress={onSiguiente}
        disabled={!puedeSiguiente}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Mes siguiente"
        accessibilityState={{ disabled: !puedeSiguiente }}
        style={[styles.flecha, !puedeSiguiente && styles.flechaOff]}
      >
        <Ionicons name="chevron-forward" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

const crearEstilos = ({ colors }: Tema) => StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  flecha: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flechaOff: {
    opacity: 0.35,
  },
  etiqueta: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: fontSizes.lg,
    color: colors.text,
  },
});