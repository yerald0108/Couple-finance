import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fontSizes, fonts, radius, spacing } from '../../theme';
import { useEstilos, useTema } from '../../theme/useTema';
import type { Tema } from '../../theme/temas';
import { formaIconos } from '../../theme/iconos';
import type { FormaDinero } from '../../types';
import { FORMA_LABEL } from '../../utils/constants';
import { formatMonto } from '../../utils/formatters';
import type { TotalesPorForma } from '../../utils/totales';

interface SaldoSectorCardProps {
  /** Total en pesos del sector (efectivo + transferencia). */
  cup: number;
  /** Lo disponible separado por forma de dinero. */
  porForma: TotalesPorForma;
}

const FORMAS: FormaDinero[] = ['efectivo', 'transferencia', 'usd'];

/** Tarjeta con lo disponible en un sector: total en pesos y el detalle por efectivo, transferencia y USD. */
export function SaldoSectorCard({ cup, porForma }: SaldoSectorCardProps) {
  const styles = useEstilos(crearEstilos);
  const { colors } = useTema();
  const enNegativo = cup < 0 || porForma.usd < 0;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Disponible en este sector</Text>
      <Text style={styles.total} accessibilityLabel={`Disponible en pesos ${formatMonto(cup)}`}>
        {formatMonto(cup)}
      </Text>
      <Text style={styles.nota}>Total en pesos (efectivo + transferencia)</Text>

      <View style={styles.formas}>
        {FORMAS.map((forma) => {
          const monto = porForma[forma];
          return (
            <View key={forma} style={styles.columna}>
              <View style={styles.etiqueta}>
                <Ionicons name={formaIconos[forma]} size={14} color="rgba(255,255,255,0.85)" />
                <Text style={styles.formaNombre} numberOfLines={1}>
                  {FORMA_LABEL[forma]}
                </Text>
              </View>
              <Text
                style={[styles.formaMonto, monto < 0 && styles.formaNegativa]}
                numberOfLines={1}
                adjustsFontSizeToFit
                accessibilityLabel={`${FORMA_LABEL[forma]} ${formatMonto(monto, forma === 'usd' ? 'USD' : 'CUP')}`}
              >
                {formatMonto(monto, forma === 'usd' ? 'USD' : 'CUP')}
              </Text>
            </View>
          );
        })}
      </View>

      {enNegativo ? (
        <View style={styles.alerta}>
          <Ionicons name="warning" size={16} color={colors.onPrimary} />
          <Text style={styles.alertaTexto}>Este sector está en negativo.</Text>
        </View>
      ) : null}
    </View>
  );
}

const crearEstilos = ({ colors, shadows }: Tema) => StyleSheet.create({
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
    color: colors.onPrimary,
  },
  nota: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  formas: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  columna: {
    flex: 1,
    gap: spacing.xs,
  },
  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  formaNombre: {
    flexShrink: 1,
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.85)',
  },
  formaMonto: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.sm,
    color: colors.onPrimary,
  },
  formaNegativa: {
    color: '#FFD0D0',
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
    color: colors.onPrimary,
  },
});