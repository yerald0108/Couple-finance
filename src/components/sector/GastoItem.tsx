import { StyleSheet, Text, View } from 'react-native';
import type { Movimiento } from '../../db/schema';
import { colors, fontSizes, fonts, spacing } from '../../theme';
import { monedaDeForma } from '../../utils/etiquetas';
import { formatFechaHora } from '../../utils/fechas';
import { formatMonto } from '../../utils/formatters';
import type { Autor } from '../../utils/notificaciones';
import { AutorChip } from '../common/AutorChip';
import { FilaPulsable } from '../common/FilaPulsable';
import { FormaBadge } from '../common/FormaBadge';

interface GastoItemProps {
  gasto: Movimiento;
  /** Quién lo registró (si se sabe, se muestra como etiqueta). */
  autor?: Autor;
  /** Si se pasa, la fila se puede tocar (para editar o eliminar el gasto). */
  onPress?: () => void;
}

/** Un gasto: concepto, fecha y hora, forma de dinero y monto (en rojo). */
export function GastoItem({ gasto, autor, onPress }: GastoItemProps) {
  const moneda = monedaDeForma(gasto.forma);
  return (
    <FilaPulsable
      onPress={onPress}
      etiqueta={`${gasto.concepto ?? 'Gasto'}, ${formatMonto(gasto.monto, moneda)}`}
    >
      <View style={styles.fila}>
        <View style={styles.info}>
          <Text style={styles.titulo} numberOfLines={2}>
            {gasto.concepto ?? 'Gasto'}
          </Text>
          <Text style={styles.fecha}>{formatFechaHora(gasto.fecha)}</Text>
          {autor ? <AutorChip autor={autor} /> : null}
        </View>
        <View style={styles.derecha}>
          <Text style={styles.monto}>-{formatMonto(gasto.monto, moneda)}</Text>
          <FormaBadge forma={gasto.forma} />
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
    color: colors.negative,
  },
});