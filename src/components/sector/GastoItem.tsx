import { StyleSheet, Text, View } from 'react-native';
import type { Movimiento } from '../../db/schema';
import { colors, fontSizes, fonts, spacing } from '../../theme';
import { monedaDeForma } from '../../utils/etiquetas';
import { formatFechaHora } from '../../utils/fechas';
import { formatMonto } from '../../utils/formatters';
import { FormaBadge } from '../common/FormaBadge';

interface GastoItemProps {
  gasto: Movimiento;
}

/** Un gasto: concepto, fecha y hora, forma de dinero y monto (en rojo). */
export function GastoItem({ gasto }: GastoItemProps) {
  return (
    <View style={styles.fila}>
      <View style={styles.info}>
        <Text style={styles.titulo} numberOfLines={2}>
          {gasto.concepto ?? 'Gasto'}
        </Text>
        <Text style={styles.fecha}>{formatFechaHora(gasto.fecha)}</Text>
      </View>
      <View style={styles.derecha}>
        <Text style={styles.monto}>-{formatMonto(gasto.monto, monedaDeForma(gasto.forma))}</Text>
        <FormaBadge forma={gasto.forma} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  titulo: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  fecha: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  derecha: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  monto: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: colors.negative,
  },
});