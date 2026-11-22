import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, fonts, radius, spacing } from '../../theme';
import { inicialDe, type Autor } from '../../utils/notificaciones';

interface AutorChipProps {
  autor: Autor;
}

/**
 * "Registrado por": círculo con la inicial y el nombre ("Tú" o el de tu pareja).
 * No dibuja nada si no se sabe quién lo registró (movimientos de antes de conectar a la pareja).
 */
export function AutorChip({ autor }: AutorChipProps) {
  if (!autor.nombre) return null;
  return (
    <View
      style={[styles.chip, autor.esYo && styles.chipYo]}
      accessible
      accessibilityLabel={`Registrado por ${autor.esYo ? 'ti' : autor.nombre}`}
    >
      <View style={[styles.circulo, autor.esYo && styles.circuloYo]}>
        <Text style={styles.inicial}>{inicialDe(autor)}</Text>
      </View>
      <Text style={[styles.nombre, autor.esYo && styles.nombreYo]} numberOfLines={1}>
        {autor.nombre}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingVertical: 2,
    paddingLeft: 2,
    paddingRight: spacing.sm,
    marginTop: 2,
  },
  chipYo: {
    backgroundColor: colors.primarySoft,
  },
  circulo: {
    width: 16,
    height: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circuloYo: {
    backgroundColor: colors.primary,
  },
  inicial: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.surface,
  },
  nombre: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  nombreYo: {
    color: colors.primary,
  },
});