import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Sector } from '../../db/schema';
import { fontSizes, fonts, radius, spacing } from '../../theme';
import { useEstilos } from '../../theme/useTema';
import type { Tema } from '../../theme/temas';
import { colorDeSector, iconoDeSector } from '../../theme/iconos';

interface SectorTileProps {
  sector: Sector;
  onPress: () => void;
}

/** Botón grande de un sector para entrar a su lista (Ingresos, Gastos fijos, Gustos, Ahorro, extras). */
export function SectorTile({ sector, onPress }: SectorTileProps) {
  const styles = useEstilos(crearEstilos);
  const color = colorDeSector(sector);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={sector.nombre}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${color}22` }]}>
        <Ionicons name={iconoDeSector(sector)} size={26} color={color} />
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {sector.nombre}
      </Text>
    </Pressable>
  );
}

const crearEstilos = ({ colors, shadows }: Tema) => StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: '47%',
    minHeight: 112,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    justifyContent: 'space-between',
    ...shadows.card,
  },
  pressed: {
    opacity: 0.85,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.md,
    color: colors.text,
  },
});