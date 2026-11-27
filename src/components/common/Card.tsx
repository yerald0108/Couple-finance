import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { radius, spacing } from '../../theme';
import { useEstilos } from '../../theme/useTema';
import type { Tema } from '../../theme/temas';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Tarjeta blanca con esquinas redondeadas y sombra suave. */
export function Card({ children, style }: CardProps) {
  const styles = useEstilos(crearEstilos);
  return <View style={[styles.card, style]}>{children}</View>;
}

const crearEstilos = ({ colors, shadows }: Tema) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    ...shadows.card,
  },
});