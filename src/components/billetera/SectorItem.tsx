import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Sector } from '../../db/schema';
import { fontSizes, fonts, radius, spacing } from '../../theme';
import { useEstilos } from '../../theme/useTema';
import type { Tema } from '../../theme/temas';
import { colorDeSector, iconoDeSector } from '../../theme/iconos';

interface SectorItemProps {
  sector: Sector;
}

/** Fila de un sector: icono de color, nombre y para qué se usa ese dinero. */
export function SectorItem({ sector }: SectorItemProps) {
  const styles = useEstilos(crearEstilos);
  const color = colorDeSector(sector);

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}22` }]}>
        <Ionicons name={iconoDeSector(sector)} size={22} color={color} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{sector.nombre}</Text>
        {sector.descripcion ? (
          <Text style={styles.description} numberOfLines={2}>
            {sector.descripcion}
          </Text>
        ) : null}
      </View>
      {sector.tipo === 'personalizado' ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Nuevo</Text>
        </View>
      ) : null}
    </View>
  );
}

const crearEstilos = ({ colors }: Tema) => StyleSheet.create({
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
  description: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  badge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.xs,
    color: colors.primaryText,
  },
});