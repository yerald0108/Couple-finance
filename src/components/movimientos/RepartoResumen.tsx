import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSizes, fonts, radius, spacing } from '../../theme';
import type { Moneda } from '../../types';
import { formatMonto } from '../../utils/formatters';
import { deCentavos } from '../../utils/montos';
import { Card } from '../common/Card';

interface RepartoResumenProps {
  /** null si todavía no hay un monto válido. */
  montoCentavos: number | null;
  repartidoCentavos: number;
  moneda: Moneda;
}

/** Muestra cuánto se ha repartido y cuánto falta por repartir (se actualiza al escribir). */
export function RepartoResumen({ montoCentavos, repartidoCentavos, moneda }: RepartoResumenProps) {
  if (montoCentavos === null) {
    return (
      <Card style={styles.card}>
        <Text style={styles.hint}>Escribe el monto del ingreso para empezar a repartirlo.</Text>
      </Card>
    );
  }

  const falta = montoCentavos - repartidoCentavos;
  const exacto = falta === 0;
  const excedido = falta < 0;
  const color = exacto ? colors.positive : excedido ? colors.negative : colors.warning;
  const porcentaje = Math.min(100, Math.round((repartidoCentavos / montoCentavos) * 100));

  const titulo = exacto
    ? 'Todo repartido'
    : excedido
      ? 'Te pasaste por'
      : 'Falta por repartir';

  return (
    <Card style={styles.card}>
      <View style={styles.fila}>
        <View style={styles.titulos}>
          <Text style={styles.titulo}>{titulo}</Text>
          {!exacto ? (
            <Text style={[styles.valor, { color }]} accessibilityLiveRegion="polite">
              {formatMonto(deCentavos(Math.abs(falta)), moneda)}
            </Text>
          ) : null}
        </View>
        {exacto ? <Ionicons name="checkmark-circle" size={40} color={color} /> : null}
      </View>

      <View style={styles.barra}>
        <View style={[styles.relleno, { width: `${porcentaje}%`, backgroundColor: color }]} />
      </View>

      <Text style={styles.detalle}>
        Repartido {formatMonto(deCentavos(repartidoCentavos), moneda)} de{' '}
        {formatMonto(deCentavos(montoCentavos), moneda)}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titulos: {
    gap: 2,
  },
  titulo: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  valor: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xxl,
  },
  barra: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  relleno: {
    height: '100%',
    borderRadius: radius.pill,
  },
  detalle: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
});