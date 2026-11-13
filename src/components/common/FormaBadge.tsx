import { StyleSheet, Text, View } from 'react-native';
import { fontSizes, fonts, formaColors, radius, spacing } from '../../theme';
import type { FormaDinero } from '../../types';
import { FORMA_LABEL } from '../../utils/constants';

/** Etiqueta pequeña de color con la forma de dinero (Efectivo, Transferencia o USD). */
export function FormaBadge({ forma }: { forma: FormaDinero }) {
  const color = formaColors[forma];
  return (
    <View style={[styles.badge, { backgroundColor: `${color}22` }]}>
      <Text style={[styles.text, { color }]}>{FORMA_LABEL[forma]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  text: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.xs,
  },
});