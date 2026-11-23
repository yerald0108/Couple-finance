import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, fonts, radius, shadows, spacing } from '../../theme';
import { formatMonto } from '../../utils/formatters';

interface ResumenInicioCardProps {
  totalCup: number;
  efectivo: number;
  transferencia: number;
  usd: number;
}

/** Tarjeta de Inicio: total en pesos y lo que hay en cada forma de dinero. */
export function ResumenInicioCard({ totalCup, efectivo, transferencia, usd }: ResumenInicioCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Total disponible</Text>
      <Text style={styles.total} accessibilityLabel={`Total disponible ${formatMonto(totalCup)}`}>
        {formatMonto(totalCup)}
      </Text>
      <Text style={styles.caption}>Efectivo + Transferencia (pesos)</Text>

      <View style={styles.formas}>
        <Forma titulo="Efectivo" valor={formatMonto(efectivo)} />
        <Forma titulo="Transferencia" valor={formatMonto(transferencia)} />
        <Forma titulo="USD" valor={formatMonto(usd, 'USD')} />
      </View>
    </View>
  );
}

function Forma({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <View style={styles.forma}>
      <Text style={styles.formaTitulo} numberOfLines={1}>
        {titulo}
      </Text>
      <Text style={styles.formaValor} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
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
    fontFamily: fonts.regular,
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
  formas: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  forma: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 2,
  },
  formaTitulo: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.8)',
  },
  formaValor: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.sm,
    color: colors.surface,
  },
});