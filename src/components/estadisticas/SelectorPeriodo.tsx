import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fontSizes, fonts, radius, spacing } from '../../theme';
import { useEstilos, useTema } from '../../theme/useTema';
import type { Tema } from '../../theme/temas';
import type { Periodo } from '../../utils/fechas';

interface SelectorPeriodoProps {
  periodo: Periodo;
  onPeriodoChange: (periodo: Periodo) => void;
  /** Texto del período que se está viendo ("Hoy, 13 nov", "9 – 15 nov 2026", "2026"…). */
  etiqueta: string;
  onAnterior: () => void;
  onSiguiente: () => void;
  /** false cuando ya se está viendo el período actual (no se puede ir al futuro). */
  puedeSiguiente: boolean;
}

const OPCIONES: { value: Periodo; label: string }[] = [
  { value: 'dia', label: 'Día' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'anio', label: 'Año' },
];

/** Pestañas Día / Semana / Mes / Año y flechas para ir al período anterior o siguiente. */
export function SelectorPeriodo({
  periodo,
  onPeriodoChange,
  etiqueta,
  onAnterior,
  onSiguiente,
  puedeSiguiente,
}: SelectorPeriodoProps) {
  const styles = useEstilos(crearEstilos);
  const { colors } = useTema();
  return (
    <View style={styles.wrap}>
      <View style={styles.tabs} accessibilityRole="tablist">
        {OPCIONES.map((op) => {
          const activa = op.value === periodo;
          return (
            <Pressable
              key={op.value}
              onPress={() => onPeriodoChange(op.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: activa }}
              accessibilityLabel={op.label}
              style={[styles.tab, activa && styles.tabActiva]}
            >
              <Text style={[styles.tabTexto, activa && styles.tabTextoActivo]}>{op.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.navegador}>
        <Pressable
          onPress={onAnterior}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Período anterior"
          style={styles.flecha}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>

        <Text style={styles.etiqueta} numberOfLines={1} adjustsFontSizeToFit>
          {etiqueta}
        </Text>

        <Pressable
          onPress={onSiguiente}
          disabled={!puedeSiguiente}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Período siguiente"
          accessibilityState={{ disabled: !puedeSiguiente }}
          style={[styles.flecha, !puedeSiguiente && styles.flechaOff]}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const crearEstilos = ({ colors }: Tema) => StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  tabActiva: {
    backgroundColor: colors.primary,
  },
  tabTexto: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  tabTextoActivo: {
    color: colors.onPrimary,
  },
  navegador: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  flecha: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flechaOff: {
    opacity: 0.35,
  },
  etiqueta: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: fontSizes.md,
    color: colors.text,
  },
});