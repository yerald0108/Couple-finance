import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fontSizes, fonts, radius, spacing } from '../../theme';
import { useEstilos, useTema } from '../../theme/useTema';
import type { Tema } from '../../theme/temas';

interface CierrePendienteCardProps {
  /** "Octubre 2026" */
  etiqueta: string;
  onAbrir: () => void;
  /** "Ahora no": quita el aviso (el cierre sigue disponible desde Estadísticas). */
  onDescartar: () => void;
}

/** Aviso de Inicio: el mes que acaba de terminar ya tiene su cierre. Se quita al abrirlo o al descartarlo. */
export function CierrePendienteCard({ etiqueta, onAbrir, onDescartar }: CierrePendienteCardProps) {
  const styles = useEstilos(crearEstilos);
  const { colors } = useTema();
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onAbrir}
        accessibilityRole="button"
        accessibilityLabel={`Ver el cierre de ${etiqueta}`}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.icono}>
          <Ionicons name="calendar" size={22} color={colors.primaryText} />
        </View>
        <View style={styles.textos}>
          <Text style={styles.titulo}>Ya está el cierre de {etiqueta}</Text>
          <Text style={styles.mensaje}>Miren juntos cuánto entró, cuánto salió y qué sector se pasó.</Text>
          <Text style={styles.accion}>Ver el resumen</Text>
        </View>
      </Pressable>
      <Pressable
        onPress={onDescartar}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Ahora no"
        style={styles.cerrar}
      >
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const crearEstilos = ({ colors, shadows }: Tema) => StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    padding: spacing.lg,
    paddingRight: spacing.xxl + spacing.md,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.85,
  },
  icono: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    flex: 1,
    gap: spacing.xs,
  },
  titulo: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  mensaje: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  accion: {
    marginTop: spacing.xs,
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: colors.primaryText,
  },
  cerrar: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});