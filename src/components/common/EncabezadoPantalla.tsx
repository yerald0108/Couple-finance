import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSizes, fonts, radius, spacing } from '../../theme';

interface EncabezadoPantallaProps {
  title: string;
  subtitle?: string;
  /** Si se pasa, se muestra un botón "atrás" junto al título. */
  onBack?: () => void;
  /** Si se pasa, se muestra a la derecha del título (por ejemplo, un botón de la barra superior). */
  derecha?: ReactNode;
}

/** Título de una pantalla (con "atrás" y acción a la derecha opcionales). Lo usan `Screen` y `PantallaLista`. */
export function EncabezadoPantalla({ title, subtitle, onBack, derecha }: EncabezadoPantallaProps) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={styles.titles}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {derecha ? <View style={styles.derecha}>{derecha}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: {
    flex: 1,
    gap: spacing.xs,
  },
  derecha: {
    alignSelf: 'flex-start',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xxl,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
});