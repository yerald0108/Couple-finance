import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, fonts, radius, shadows, spacing } from '../../theme';
import { formatMonto } from '../../utils/formatters';

interface ResumenGastoCardProps {
  totalCup: number;
  totalUsd: number;
  cantidad: number;
}

/** Tarjeta con lo gastado en el período: pesos arriba, USD aparte y cuántos gastos fueron. */
export function ResumenGastoCard({ totalCup, totalUsd, cantidad }: ResumenGastoCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Total gastado</Text>
      <Text style={styles.total} accessibilityLabel={`Total gastado ${formatMonto(totalCup)}`}>
        {formatMonto(totalCup)}
      </Text>
      <Text style={styles.caption}>Efectivo + Transferencia (pesos)</Text>

      <View style={styles.pie}>
        <View style={styles.usdPill}>
          <Text style={styles.usdLabel}>USD aparte</Text>
          <Text style={styles.usdValue}>{formatMonto(totalUsd, 'USD')}</Text>
        </View>
        <Text style={styles.cantidad}>
          {cantidad} {cantidad === 1 ? 'gasto' : 'gastos'}
        </Text>
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
  pie: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  usdPill: {
    flex: 1,
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
    fontSize: fontSizes.md,
    color: colors.surface,
  },
  cantidad: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
  },
});