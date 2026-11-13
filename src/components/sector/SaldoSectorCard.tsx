import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, fonts, radius, shadows, spacing } from '../../theme';
import { formatMonto } from '../../utils/formatters';

interface SaldoSectorCardProps {
  cup: number;
  usd: number;
}

/** Tarjeta con lo disponible en un sector (pesos y USD aparte). */
export function SaldoSectorCard({ cup, usd }: SaldoSectorCardProps) {
  const enNegativo = cup < 0 || usd < 0;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Disponible en este sector</Text>
      <Text style={styles.total} accessibilityLabel={`Disponible ${formatMonto(cup)}`}>
        {formatMonto(cup)}
      </Text>

      <View style={styles.usdPill}>
        <Text style={styles.usdLabel}>USD aparte</Text>
        <Text style={styles.usdValue}>{formatMonto(usd, 'USD')}</Text>
      </View>

      {enNegativo ? (
        <View style={styles.alerta}>
          <Ionicons name="warning" size={16} color={colors.surface} />
          <Text style={styles.alertaTexto}>Este sector está en negativo.</Text>
        </View>
      ) : null}
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
  alerta: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  alertaTexto: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.xs,
    color: colors.surface,
  },
});