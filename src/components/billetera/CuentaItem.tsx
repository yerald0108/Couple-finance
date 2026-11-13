import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Cuenta } from '../../db/schema';
import { colors, fontSizes, fonts, formaColors, radius, spacing } from '../../theme';
import { formaIconos } from '../../theme/iconos';
import { formatMonto } from '../../utils/formatters';

interface CuentaItemProps {
  cuenta: Cuenta;
}

/** Fila de una cuenta: icono de color, nombre, moneda y saldo. */
export function CuentaItem({ cuenta }: CuentaItemProps) {
  const color = formaColors[cuenta.tipo];

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}22` }]}>
        <Ionicons name={formaIconos[cuenta.tipo]} size={22} color={color} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{cuenta.nombre}</Text>
        <Text style={styles.currency}>{cuenta.moneda === 'USD' ? 'Dólares' : 'Pesos'}</Text>
      </View>
      <Text style={styles.amount}>{formatMonto(cuenta.saldo, cuenta.moneda)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  currency: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  amount: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: colors.text,
  },
});