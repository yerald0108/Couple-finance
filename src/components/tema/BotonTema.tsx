import { Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useTemaStore } from '../../store/useTemaStore';
import { radius } from '../../theme';
import type { Tema } from '../../theme/temas';
import { useEstilos, useTema } from '../../theme/useTema';
import { etiquetaBotonTema, iconoDeModo } from '../../utils/tema';

/** Botón de la esquina de Inicio, junto a la campana: muestra el modo (claro, oscuro o automático) y abre dónde cambiarlo. */
export function BotonTema() {
  const styles = useEstilos(crearEstilos);
  const { colors } = useTema();
  const router = useRouter();
  const modo = useTemaStore((s) => s.modo);

  return (
    <Pressable
      onPress={() => router.push('/tema')}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={etiquetaBotonTema(modo)}
      accessibilityHint="Abre las opciones de apariencia"
      style={({ pressed }) => [styles.boton, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={iconoDeModo(modo)} size={22} color={colors.text} />
    </Pressable>
  );
}

const crearEstilos = ({ colors }: Tema) => StyleSheet.create({
  boton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});