import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fontSizes, fonts, spacing } from '../../theme';
import { useEstilos, useTema } from '../../theme/useTema';
import type { Tema } from '../../theme/temas';

interface SectionTitleProps {
  title: string;
  /** Acción opcional a la derecha (por ejemplo "Nuevo"). */
  actionLabel?: string;
  onActionPress?: () => void;
}

export function SectionTitle({ title, actionLabel, onActionPress }: SectionTitleProps) {
  const styles = useEstilos(crearEstilos);
  const { colors } = useTema();
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onActionPress ? (
        <Pressable
          onPress={onActionPress}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={styles.action}
        >
          <Ionicons name="add-circle" size={20} color={colors.primaryText} />
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const crearEstilos = ({ colors }: Tema) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.lg,
    color: colors.text,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: colors.primaryText,
  },
});