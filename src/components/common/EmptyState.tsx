import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fontSizes, fonts, radius, spacing } from '../../theme';
import { useEstilos, useTema } from '../../theme/useTema';
import type { Tema } from '../../theme/temas';
import { Button } from './Button';
import { Card } from './Card';

interface EmptyStateProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  message: string;
  /** Si se pasan los dos, se muestra un botón que lleva a lo siguiente que hay que hacer. */
  actionLabel?: string;
  onAction?: () => void;
}

/** Estado vacío: icono, título, explicación y, si hace falta, un botón con la acción a seguir. */
export function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  const styles = useEstilos(crearEstilos);
  const { colors } = useTema();
  return (
    <Card style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={32} color={colors.primaryText} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button title={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </Card>
  );
}

const crearEstilos = ({ colors }: Tema) => StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.lg,
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  action: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
});