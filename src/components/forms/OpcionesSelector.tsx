import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fontSizes, fonts, radius, spacing } from '../../theme';
import { useEstilos, useTema } from '../../theme/useTema';
import type { Tema } from '../../theme/temas';
import type { IconName } from '../../theme/iconos';

export interface Opcion<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
  /** Color de la opción cuando está elegida (por defecto, el color principal). */
  color?: string;
  /** true = no se puede elegir (por ejemplo, una forma de dinero que se agotó). */
  deshabilitada?: boolean;
  /** Texto pequeño bajo el nombre ("Agotado"). */
  nota?: string;
}

interface OpcionesSelectorProps<T extends string> {
  label: string;
  opciones: Opcion<T>[];
  valor: T | null;
  onChange: (valor: T) => void;
  /** Cuántas opciones caben por fila (3 o 2). */
  columnas?: 2 | 3;
  error?: string;
}

/** Botones grandes para elegir UNA opción (forma de dinero, origen del ingreso, etc.). */
export function OpcionesSelector<T extends string>({
  label,
  opciones,
  valor,
  onChange,
  columnas = 3,
  error,
}: OpcionesSelectorProps<T>) {
  const styles = useEstilos(crearEstilos);
  const { colors } = useTema();
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.grid}>
        {opciones.map((opcion) => {
          const elegida = opcion.value === valor;
          const color = opcion.color ?? colors.primaryText;
          const deshabilitada = opcion.deshabilitada === true;
          return (
            <Pressable
              key={opcion.value}
              onPress={() => onChange(opcion.value)}
              disabled={deshabilitada}
              accessibilityRole="radio"
              accessibilityState={{ selected: elegida, disabled: deshabilitada }}
              accessibilityLabel={opcion.nota ? `${opcion.label}, ${opcion.nota}` : opcion.label}
              style={({ pressed }) => [
                styles.opcion,
                { flexBasis: columnas === 3 ? '30%' : '47%' },
                elegida && { borderColor: color, backgroundColor: `${color}1A` },
                pressed && styles.pressed,
                deshabilitada && styles.deshabilitada,
              ]}
            >
              {opcion.icon ? (
                <Ionicons
                  name={opcion.icon}
                  size={22}
                  color={elegida ? color : colors.textMuted}
                />
              ) : null}
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[styles.texto, elegida && { color }]}
              >
                {opcion.label}
              </Text>
              {opcion.nota ? <Text style={styles.nota}>{opcion.nota}</Text> : null}
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const crearEstilos = ({ colors }: Tema) => StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  opcion: {
    flexGrow: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.85,
  },
  deshabilitada: {
    opacity: 0.45,
    backgroundColor: colors.background,
  },
  nota: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.negative,
  },
  texto: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.negative,
  },
});