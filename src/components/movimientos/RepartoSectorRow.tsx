import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Sector } from '../../db/schema';
import { colors, fontSizes, fonts, radius, spacing } from '../../theme';
import { colorDeSector, iconoDeSector } from '../../theme/iconos';
import type { Moneda } from '../../types';
import { MontoInput } from '../forms/MontoInput';

interface RepartoSectorRowProps {
  sector: Sector;
  valor: string;
  onChange: (texto: string) => void;
  moneda: Moneda;
}

/** Una fila del reparto: el sector (icono + nombre) y cuánto dinero le toca. */
export function RepartoSectorRow({ sector, valor, onChange, moneda }: RepartoSectorRowProps) {
  const color = colorDeSector(sector);

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}22` }]}>
        <Ionicons name={iconoDeSector(sector)} size={20} color={color} />
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {sector.nombre}
      </Text>
      <MontoInput
        compacto
        value={valor}
        onChangeText={onChange}
        moneda={moneda}
        accessibilityLabel={`Monto para ${sector.nombre}`}
      />
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
  name: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
});