import { StyleSheet, Text, View } from 'react-native';
import type { HistorialAhorroItem } from '../../db/queries/listados';
import { colors, fontSizes, fonts, spacing } from '../../theme';
import { monedaDeForma, origenLabel } from '../../utils/etiquetas';
import { formatFechaHora } from '../../utils/fechas';
import { formatMonto } from '../../utils/formatters';
import { FormaBadge } from '../common/FormaBadge';

interface AhorroItemProps {
  item: HistorialAhorroItem;
}

/** Una fila del historial de ahorro: entrada (verde, con su origen) o salida (roja, con su motivo). */
export function AhorroItem({ item }: AhorroItemProps) {
  const entrada = item.clase === 'entrada';
  const moneda = monedaDeForma(item.forma);

  return (
    <View style={styles.fila}>
      <View style={styles.info}>
        <Text style={styles.titulo} numberOfLines={2}>
          {entrada ? `Entrada · ${origenLabel(item.detalle)}` : `Salida · ${item.detalle ?? ''}`}
        </Text>
        <Text style={styles.fecha}>{formatFechaHora(item.fecha)}</Text>
      </View>
      <View style={styles.derecha}>
        <Text style={[styles.monto, { color: entrada ? colors.positive : colors.negative }]}>
          {entrada ? '+' : '-'}
          {formatMonto(item.monto, moneda)}
        </Text>
        <FormaBadge forma={item.forma} />
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
  },
});