import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, fonts, radius, shadows, spacing } from '../../theme';
import { formatMonto } from '../../utils/formatters';

interface ResumenSaldosCardProps {
  totalCup: number;
  usd: number;
}

/** Tarjeta destacada: total en pesos (efectivo + transferencia) y el USD aparte. */
export function ResumenSaldosCard({ totalCup, usd }: ResumenSaldosCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Total en pesos</Text>
      <Text style={styles.total} accessibilityLabel={`Total en pesos ${formatMonto(totalCup)}`}>
        {formatMonto(totalCup)}
      </Text>
      <Text style={styles.caption}>Efectivo + Transferencia</Text>

      <View style={styles.usdPill}>
        <Text style={styles.usdLabel}>USD aparte</Text>
        <Text style={styles.usdValue}>{formatMonto(usd, 'USD')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.xs,
    ...shadows.card,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  total: {
    fontFamily: fonts.bold,
    fontSize: 36,
    color: colors.surface,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  usdPill: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  usdLabel: {
    fontFamily: fonts.medium,
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
  },
  usdValue: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.surface,
  },
});