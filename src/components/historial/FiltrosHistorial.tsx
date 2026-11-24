import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSizes, fonts, radius, spacing } from '../../theme';
import {
  FILTROS_TIPO,
  compararMes,
  etiquetaMes,
  mesDe,
  moverMes,
  type FiltroTipo,
  type MesFiltro,
} from '../../utils/historial';
import { NavegadorMes } from '../cierre/NavegadorMes';

interface FiltrosHistorialProps {
  tipo: FiltroTipo;
  onTipoChange: (tipo: FiltroTipo) => void;
  /** null = todos los meses. */
  mes: MesFiltro | null;
  onMesChange: (mes: MesFiltro | null) => void;
  /** El mes del movimiento más antiguo: hasta ahí se puede retroceder. null si todavía no hay movimientos. */
  primerMes: MesFiltro | null;
}

/** Filtros del historial: Todos / Ingresos / Gastos y "todos los meses" o un mes concreto con flechas. */
export function FiltrosHistorial({ tipo, onTipoChange, mes, onMesChange, primerMes }: FiltrosHistorialProps) {
  const actual = mesDe(new Date());

  return (
    <View style={styles.wrap}>
      <View style={styles.tabs} accessibilityRole="tablist">
        {FILTROS_TIPO.map((op) => {
          const activa = op.value === tipo;
          return (
            <Pressable
              key={op.value}
              onPress={() => onTipoChange(op.value)}
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

      {mes === null ? (
        <View style={styles.filaMes}>
          <Text style={styles.todosLosMeses}>Todos los meses</Text>
          <Pressable
            onPress={() => onMesChange(actual)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Elegir un mes"
            style={({ pressed }) => [styles.accion, pressed && styles.pressed]}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={styles.accionTexto}>Elegir mes</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <NavegadorMes
            etiqueta={etiquetaMes(mes)}
            onAnterior={() => onMesChange(moverMes(mes, -1))}
            onSiguiente={() => onMesChange(moverMes(mes, 1))}
            puedeAnterior={primerMes !== null && compararMes(mes, primerMes) > 0}
            puedeSiguiente={compararMes(mes, actual) < 0}
          />
          <Pressable
            onPress={() => onMesChange(null)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Ver todos los meses"
            style={({ pressed }) => [styles.verTodos, pressed && styles.pressed]}
          >
            <Text style={styles.accionTexto}>Ver todos los meses</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: colors.surface,
  },
  filaMes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 44,
  },
  todosLosMeses: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  accion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  accionTexto: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: colors.primary,
  },
  verTodos: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
});