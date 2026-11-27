import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Card } from '../components/common/Card';
import { Divider } from '../components/common/Divider';
import { ModalScreen } from '../components/common/ModalScreen';
import { useTemaStore } from '../store/useTemaStore';
import { fontSizes, fonts, radius, spacing } from '../theme';
import type { ModoTema, Tema } from '../theme/temas';
import { useEstilos, useTema } from '../theme/useTema';
import { OPCIONES_TEMA } from '../utils/tema';

/**
 * Ventana (desde el botón de Inicio) para elegir cómo se ve la app: claro, oscuro o el del teléfono.
 * El cambio se ve al instante, sin botón de guardar. Se guarda solo en este teléfono: el de tu pareja es independiente.
 */
export default function TemaScreen() {
  const styles = useEstilos(crearEstilos);
  const { colors } = useTema();
  const db = useSQLiteContext();
  const router = useRouter();
  const modo = useTemaStore((s) => s.modo);
  const cambiar = useTemaStore((s) => s.cambiar);
  const [sinGuardar, setSinGuardar] = useState(false);

  async function elegir(nuevo: ModoTema) {
    if (nuevo === modo) return;
    const guardado = await cambiar(db, nuevo);
    setSinGuardar(!guardado);
  }

  return (
    <ModalScreen title="Apariencia" subtitle="Solo cambia en este teléfono." onClose={() => router.back()}>
      <Card style={styles.card}>
        <View accessibilityRole="radiogroup">
          {OPCIONES_TEMA.map((opcion, i) => {
            const elegida = opcion.value === modo;
            return (
              <View key={opcion.value}>
                {i > 0 ? <Divider /> : null}
                <Pressable
                  onPress={() => void elegir(opcion.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: elegida }}
                  accessibilityLabel={`${opcion.label}. ${opcion.descripcion}`}
                  style={({ pressed }) => [styles.fila, pressed && styles.pressed]}
                >
                  <View style={[styles.icono, elegida && styles.iconoElegido]}>
                    <Ionicons name={opcion.icono} size={22} color={elegida ? colors.onPrimary : colors.primaryText} />
                  </View>
                  <View style={styles.textos}>
                    <Text style={styles.label}>{opcion.label}</Text>
                    <Text style={styles.descripcion}>{opcion.descripcion}</Text>
                  </View>
                  {elegida ? <Ionicons name="checkmark-circle" size={24} color={colors.primaryText} /> : null}
                </Pressable>
              </View>
            );
          })}
        </View>
      </Card>

      {sinGuardar ? (
        <Text style={styles.aviso}>
          No se pudo guardar tu elección. Se queda así hasta que cierres la app.
        </Text>
      ) : null}
    </ModalScreen>
  );
}

const crearEstilos = ({ colors }: Tema) => StyleSheet.create({
  card: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  icono: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoElegido: {
    backgroundColor: colors.primary,
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  descripcion: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  aviso: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.warning,
  },
});