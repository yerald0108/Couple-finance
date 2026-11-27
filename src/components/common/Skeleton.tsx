import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { radius, spacing } from '../../theme';
import { useEstilos } from '../../theme/useTema';
import type { Tema } from '../../theme/temas';

/** Valor animado compartido por todos los bloques de un grupo: laten a la vez y con una sola animación. */
const PulsoContext = createContext<Animated.Value | null>(null);

/** true si la persona pidió "reducir movimiento" en el teléfono: entonces el esqueleto queda quieto. */
function useReducirMovimiento(): boolean {
  const [reducir, setReducir] = useState(false);
  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((valor) => {
        if (vivo) setReducir(valor);
      })
      .catch(() => undefined);
    const suscripcion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducir);
    return () => {
      vivo = false;
      suscripcion.remove();
    };
  }, []);
  return reducir;
}

interface SkeletonGroupProps {
  children: ReactNode;
  /** Lo que lee el lector de pantalla (una sola vez para todo el grupo). */
  etiqueta?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Agrupa los bloques de un esqueleto: les da el latido, se anuncia una sola vez como "Cargando"
 * y deja el mismo espacio entre bloques que tiene `Screen` entre sus elementos.
 */
export function SkeletonGroup({ children, etiqueta = 'Cargando', style }: SkeletonGroupProps) {
  const styles = useEstilos(crearEstilos);
  const reducir = useReducirMovimiento();
  const pulso = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducir) {
      pulso.setValue(0);
      return;
    }
    const animacion = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    animacion.start();
    return () => animacion.stop();
  }, [reducir, pulso]);

  return (
    <PulsoContext.Provider value={reducir ? null : pulso}>
      <View
        style={[styles.grupo, style]}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={etiqueta}
        accessibilityState={{ busy: true }}
      >
        {children}
      </View>
    </PulsoContext.Provider>
  );
}

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radio?: number;
  /** Para bloques sobre un fondo de color (la tarjeta violeta): usa un blanco translúcido. */
  sobreColor?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Un bloque gris que late. Pon uno donde irá un texto, un icono o un monto. */
export function Skeleton({ width = '100%', height = 16, radio = radius.sm, sobreColor = false, style }: SkeletonProps) {
  const styles = useEstilos(crearEstilos);
  const pulso = useContext(PulsoContext);
  const opacity = pulso ? pulso.interpolate({ inputRange: [0, 1], outputRange: [1, 0.45] }) : 1;
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radio, opacity },
        sobreColor ? styles.sobreColor : styles.base,
        style,
      ]}
    />
  );
}

const crearEstilos = ({ colors }: Tema) => StyleSheet.create({
  grupo: {
    gap: spacing.lg,
  },
  base: {
    backgroundColor: colors.border,
  },
  sobreColor: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
});