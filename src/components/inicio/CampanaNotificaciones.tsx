import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useNotificacionesStore } from '../../store/useNotificacionesStore';
import { useSesionStore } from '../../store/useSesionStore';
import { useSyncStore } from '../../store/useSyncStore';
import { fontSizes, fonts, radius } from '../../theme';
import { useEstilos, useTema } from '../../theme/useTema';
import type { Tema } from '../../theme/temas';
import { textoInsignia } from '../../utils/notificaciones';

/** Botón de la esquina de Inicio: campana con el número de movimientos nuevos de tu pareja. Abre las notificaciones. */
export function CampanaNotificaciones() {
  const styles = useEstilos(crearEstilos);
  const { colors } = useTema();
  const db = useSQLiteContext();
  const router = useRouter();
  const yoId = useSesionStore((s) => s.usuario?.id ?? null);
  const noLeidas = useNotificacionesStore((s) => s.noLeidas);
  const cargar = useNotificacionesStore((s) => s.cargar);
  // Sube cuando llegaron cambios de la pareja.
  const datosVersion = useSyncStore((s) => s.datosVersion);

  useFocusEffect(
    useCallback(() => {
      void cargar(db, yoId);
    }, [db, yoId, datosVersion, cargar]),
  );

  const etiqueta =
    noLeidas > 0
      ? `Notificaciones, ${noLeidas} ${noLeidas === 1 ? 'nueva' : 'nuevas'}`
      : 'Notificaciones';

  return (
    <Pressable
      onPress={() => router.push('/notificaciones')}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={({ pressed }) => [styles.boton, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={noLeidas > 0 ? 'notifications' : 'notifications-outline'} size={22} color={colors.text} />
      {noLeidas > 0 ? (
        <View style={styles.insignia}>
          <Text style={styles.insigniaTexto}>{textoInsignia(noLeidas)}</Text>
        </View>
      ) : null}
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
  insignia: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.negative,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insigniaTexto: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xs - 2,
    color: colors.onNegative,
  },
});