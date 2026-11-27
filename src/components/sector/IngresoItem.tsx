import { StyleSheet, Text, View } from 'react-native';
import type { IngresoMes } from '../../db/queries/listados';
import { fontSizes, fonts, spacing } from '../../theme';
import { useEstilos } from '../../theme/useTema';
import type { Tema } from '../../theme/temas';
import { monedaDeForma, origenLabel } from '../../utils/etiquetas';
import { formatFechaHora } from '../../utils/fechas';
import { formatMonto } from '../../utils/formatters';
import type { Autor } from '../../utils/notificaciones';
import { AutorChip } from '../common/AutorChip';
import { FilaPulsable } from '../common/FilaPulsable';
import { FormaBadge } from '../common/FormaBadge';

interface IngresoItemProps {
  ingreso: IngresoMes;
  /** Quién lo registró (si se sabe, se muestra como etiqueta). */
  autor?: Autor;
  /** Si se pasa, la fila se puede tocar (para editar o eliminar el ingreso). */
  onPress?: () => void;
}

/** Un ingreso: origen, fecha y hora, forma de dinero, monto y cómo se repartió. */
export function IngresoItem({ ingreso, autor, onPress }: IngresoItemProps) {
  const styles = useEstilos(crearEstilos);
  const { movimiento, repartos } = ingreso;
  const moneda = monedaDeForma(movimiento.forma);

  return (
    <FilaPulsable
      onPress={onPress}
      etiqueta={`${origenLabel(movimiento.origen)}, ${formatMonto(movimiento.monto, moneda)}`}
    >
      <View style={styles.item}>
        <View style={styles.fila}>
          <View style={styles.info}>
            <Text style={styles.titulo}>{origenLabel(movimiento.origen)}</Text>
            <Text style={styles.fecha}>{formatFechaHora(movimiento.fecha)}</Text>
            {autor ? <AutorChip autor={autor} /> : null}
          </View>
          <View style={styles.derecha}>
            <Text style={styles.monto}>+{formatMonto(movimiento.monto, moneda)}</Text>
            <FormaBadge forma={movimiento.forma} />
          </View>
        </View>

        {repartos.length > 0 ? (
          <View style={styles.repartos}>
            <Text style={styles.repartosTitulo}>Reparto</Text>
            {repartos.map((r) => (
              <View key={r.sector_id} style={styles.repartoFila}>
                <Text style={styles.repartoNombre}>{r.sector_nombre}</Text>
                <Text style={styles.repartoMonto}>{formatMonto(r.monto, moneda)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </FilaPulsable>
  );
}

const crearEstilos = ({ colors }: Tema) => StyleSheet.create({
  item: {
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
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
    color: colors.positive,
  },
  repartos: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: spacing.md,
    gap: spacing.xs,
  },
  repartosTitulo: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  repartoFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  repartoNombre: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  repartoMonto: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
});