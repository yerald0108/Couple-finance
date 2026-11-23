import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSizes, fonts, formaColors, radius, spacing } from '../../theme';
import { formaIconos } from '../../theme/iconos';
import type { FormaDinero } from '../../types';
import { FORMA_LABEL } from '../../utils/constants';
import { formatMonto } from '../../utils/formatters';
import type { TotalesPorForma } from '../../utils/totales';
import { Card } from '../common/Card';

interface TotalesFormaCardProps {
  titulo: string;
  totales: TotalesPorForma;
}

const FORMAS: FormaDinero[] = ['efectivo', 'transferencia', 'usd'];

/** Totales de un período separados por forma de dinero (efectivo, transferencia y USD). */
export function TotalesFormaCard({ titulo, totales }: TotalesFormaCardProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.titulo}>{titulo}</Text>
      <View style={styles.fila}>
        {FORMAS.map((forma) => {
          const color = formaColors[forma];
          return (
            <View key={forma} style={styles.columna}>
              <View style={[styles.icono, { backgroundColor: `${color}22` }]}>
                <Ionicons name={formaIconos[forma]} size={18} color={color} />
              </View>
              <Text style={styles.forma} numberOfLines={1}>
                {FORMA_LABEL[forma]}
              </Text>
              <Text style={styles.monto} numberOfLines={1} adjustsFontSizeToFit>
                {formatMonto(totales[forma], forma === 'usd' ? 'USD' : 'CUP')}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  titulo: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  fila: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  columna: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  icono: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forma: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  monto: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
});