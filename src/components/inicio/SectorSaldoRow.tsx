import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SaldoSector } from '../../db/queries/saldosSectores';
import type { Sector } from '../../db/schema';
import { colors, fontSizes, fonts, radius, spacing } from '../../theme';
import { colorDeSector, iconoDeSector } from '../../theme/iconos';
import { formatMonto } from '../../utils/formatters';

interface SectorSaldoRowProps {
  sector: Sector;
  saldo?: SaldoSector;
  /** Texto pequeño bajo el nombre (por ejemplo "Este mes" en la fila de Ingresos). */
  detalle?: string;
}

/** Fila de "Disponible por sector": icono, nombre y lo que hay (pesos, y USD si tiene). */
export function SectorSaldoRow({ sector, saldo, detalle }: SectorSaldoRowProps) {
  const color = colorDeSector(sector);
  const cup = saldo?.cup ?? 0;
  const usd = saldo?.usd ?? 0;

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}22` }]}>
        <Ionicons name={iconoDeSector(sector)} size={20} color={color} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {sector.nombre}
        </Text>
        {detalle ? <Text style={styles.detalle}>{detalle}</Text> : null}
      </View>
      <View style={styles.amounts}>
        <Text style={[styles.amount, cup < 0 && styles.negative]}>{formatMonto(cup)}</Text>
        {usd !== 0 ? (
          <Text style={[styles.usd, usd < 0 && styles.negative]}>{formatMonto(usd, 'USD')}</Text>
        ) : null}
      </View>
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
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  detalle: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  name: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  amounts: {
    alignItems: 'flex-end',
  },
  amount: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  usd: {
    fontFamily: fonts.medium,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  negative: {
    color: colors.negative,
  },
});