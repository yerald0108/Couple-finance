import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useSesionStore } from '../../store/useSesionStore';
import { syncStore } from '../../store/useSyncStore';
import { colors, fontSizes, fonts, spacing } from '../../theme';
import { confirmar } from '../../utils/dialogos';

/** Enlace "Cerrar sesión" con confirmación. Los movimientos y saldos de este teléfono NO se borran. */
export function CerrarSesionBoton() {
  const db = useSQLiteContext();
  const salir = useSesionStore((s) => s.salir);
  const [saliendo, setSaliendo] = useState(false);

  async function pulsar() {
    // Antes de preguntar se intenta enviar lo pendiente (si no hay internet, simplemente no sale).
    let pendientes = 0;
    if (syncStore.getState().activo) {
      await syncStore.getState().sincronizar(db);
      pendientes = syncStore.getState().pendientes;
    }
    const aviso =
      pendientes > 0
        ? pendientes === 1
          ? ' Tienes 1 cambio que todavía no llegó a tu pareja: se enviará cuando vuelvas a entrar con la misma cuenta.'
          : ` Tienes ${pendientes} cambios que todavía no llegaron a tu pareja: se enviarán cuando vuelvas a entrar con la misma cuenta.`
        : '';
    const si = await confirmar({
      titulo: 'Cerrar sesión',
      mensaje:
        'Este teléfono dejará de estar conectado a tu pareja. Tus movimientos y saldos se quedan guardados aquí.' +
        aviso,
      textoConfirmar: 'Cerrar sesión',
      destructivo: true,
    });
    if (!si) return;
    setSaliendo(true);
    await salir(db);
  }

  return (
    <Pressable
      onPress={pulsar}
      disabled={saliendo}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Cerrar sesión"
      style={({ pressed }) => [styles.boton, pressed && { opacity: 0.6 }]}
    >
      <Text style={styles.texto}>{saliendo ? 'Cerrando…' : 'Cerrar sesión'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
  },
  texto: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: colors.negative,
  },
});