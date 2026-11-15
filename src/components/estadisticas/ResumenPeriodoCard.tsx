import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, fonts, radius, shadows, spacing } from '../../theme';
import type { ResumenPeriodo } from '../../utils/analisis';
import { formatMonto } from '../../utils/formatters';

interface ResumenPeriodoCardProps {
  resumen: ResumenPeriodo;
  /** Cuántos gastos hubo en el período. */
  cantidad: number;
}

/** Tarjeta principal: balance del período (ingresos − gastos) en pesos, USD aparte y cuánto de lo ingresado se gastó. */
export function ResumenPeriodoCard({ resumen, cantidad }: ResumenPeriodoCardProps) {
  const { ingresos, gastos, balance, porcentajeGastado } = resumen;
  const hayUsd = ingresos.usd > 0 || gastos.usd > 0;
  const llenado = porcentajeGastado === null ? 0 : Math.min(100, Math.max(0, porcentajeGastado));

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Balance del período</Text>
      <Text
        style={[styles.total, balance.cup < 0 && styles.negativo]}
        accessibilityLabel={`Balance en pesos ${formatMonto(balance.cup)}`}
      >
        {formatMonto(balance.cup)}
      </Text>
      <Text style={styles.caption}>Ingresos − gastos · efectivo + transferencia (pesos)</Text>

      <View style={styles.columnas}>
        <View style={styles.columna}>
          <View style={styles.etiqueta}>
            <Ionicons name="arrow-down-circle" size={16} color="rgba(255,255,255,0.9)" />
            <Text style={styles.columnaNombre}>Ingresos</Text>
          </View>
          <Text style={styles.columnaMonto} numberOfLines={1} adjustsFontSizeToFit>
            {formatMonto(ingresos.cup)}
          </Text>
        </View>
        <View style={styles.separador} />
        <View style={styles.columna}>
          <View style={styles.etiqueta}>
            <Ionicons name="arrow-up-circle" size={16} color="rgba(255,255,255,0.9)" />
            <Text style={styles.columnaNombre}>
              Gastos · {cantidad} {cantidad === 1 ? 'gasto' : 'gastos'}
            </Text>
          </View>
          <Text style={styles.columnaMonto} numberOfLines={1} adjustsFontSizeToFit>
            {formatMonto(gastos.cup)}
          </Text>
        </View>
      </View>

      {porcentajeGastado !== null ? (
        <View style={styles.progreso}>
          <View style={styles.pista}>
            <View style={[styles.relleno, { width: `${llenado}%` }, porcentajeGastado > 100 && styles.rellenoExceso]} />
          </View>
          <Text style={styles.progresoTexto}>
            Gastaste el {Math.round(porcentajeGastado)} % de lo que ingresaste
          </Text>
        </View>
      ) : null}

      {hayUsd ? (
        <View style={styles.usd}>
          <Text style={styles.usdTitulo}>USD aparte</Text>
          <View style={styles.usdFila}>
            <Text style={styles.usdTexto}>Ingresos {formatMonto(ingresos.usd, 'USD')}</Text>
            <Text style={styles.usdTexto}>Gastos {formatMonto(gastos.usd, 'USD')}</Text>
          </View>
          <Text style={[styles.usdBalance, balance.usd < 0 && styles.negativo]}>
            Balance {formatMonto(balance.usd, 'USD')}
          </Text>
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
  negativo: {
    color: '#FFD0D0',
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  columnas: {
    marginTop: spacing.md,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  columna: {
    flex: 1,
    gap: spacing.xs,
  },
  separador: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  columnaNombre: {
    flexShrink: 1,
    fontFamily: fonts.medium,
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.85)',
  },
  columnaMonto: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: colors.surface,
  },
  progreso: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  pista: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  relleno: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  rellenoExceso: {
    backgroundColor: '#FFB4B4',
  },
  progresoTexto: {
    fontFamily: fonts.medium,
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.85)',
  },
  usd: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  usdTitulo: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.9)',
  },
  usdFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  usdTexto: {
    fontFamily: fonts.medium,
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.85)',
  },
  usdBalance: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: colors.surface,
  },
});