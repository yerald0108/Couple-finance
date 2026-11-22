import { StyleSheet, Text, View } from 'react-native';
import type { HistorialAhorroItem } from '../../db/queries/listados';
import { colors, fontSizes, fonts, spacing } from '../../theme';
import { monedaDeForma, origenLabel } from '../../utils/etiquetas';
import { formatFechaHora } from '../../utils/fechas';
import { formatMonto } from '../../utils/formatters';
import type { Autor } from '../../utils/notificaciones';
import { AutorChip } from '../common/AutorChip';
import { FilaPulsable } from '../common/FilaPulsable';
import { FormaBadge } from '../common/FormaBadge';

interface AhorroItemProps {
  item: HistorialAhorroItem;
  /** Quién registró el movimiento (si se sabe, se muestra como etiqueta). */
  autor?: Autor;
  /** Si se pasa, la fila se puede tocar (se usa en las salidas, que se editan o eliminan). */
  onPress?: () => void;
}

/** Una fila del historial de ahorro: entrada (verde, con su origen) o salida (roja, con su motivo). */
export function AhorroItem({ item, autor, onPress }: AhorroItemProps) {
  const entrada = item.clase === 'entrada';
  const moneda = monedaDeForma(item.forma);
  const titulo = entrada ? `Entrada · ${origenLabel(item.detalle)}` : `Salida · ${item.detalle ?? ''}`;

  return (
    <FilaPulsable onPress={onPress} etiqueta={`${titulo}, ${formatMonto(item.monto, moneda)}`}>
      <View style={styles.fila}>
        <View style={styles.info}>
          <Text style={styles.titulo} numberOfLines={2}>
            {titulo}
          </Text>
          <Text style={styles.fecha}>{formatFechaHora(item.fecha)}</Text>
          {autor ? <AutorChip autor={autor} /> : null}
        </View>
        <View style={styles.derecha}>
          <Text style={[styles.monto, { color: entrada ? colors.positive : colors.negative }]}>
            {entrada ? '+' : '-'}
            {formatMonto(item.monto, moneda)}
          </Text>
          <FormaBadge forma={item.forma} />
        </View>
      </View>
    </FilaPulsable>
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