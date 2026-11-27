import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useSesionStore } from '../../store/useSesionStore';
import { useSyncStore } from '../../store/useSyncStore';
import { fontSizes, fonts, radius, spacing } from '../../theme';
import { useEstilos, useTema } from '../../theme/useTema';
import type { Tema } from '../../theme/temas';
import { formatearCodigo } from '../../utils/cuentaValidation';

/** Tarjeta de Billetera: estado de la cuenta y la pareja. Al tocarla se abre la ventana de sincronización. */
export function SincronizacionCard() {
  const styles = useEstilos(crearEstilos);
  const { colors } = useTema();
  const router = useRouter();
  const configurado = useSesionStore((s) => s.configurado);
  const cargando = useSesionStore((s) => s.cargando);
  const usuario = useSesionStore((s) => s.usuario);
  const pareja = useSesionStore((s) => s.pareja);
  const estadoSync = useSyncStore((s) => s.estado);
  const pendientes = useSyncStore((s) => s.pendientes);

  let titulo = 'Sincronizar con tu pareja';
  let detalle = 'Usa la app en los dos teléfonos con la misma información.';
  let accion = 'Activar';
  let icono: 'sync-circle' | 'checkmark-circle' | 'person-circle' | 'construct' | 'git-merge' | 'cloud-offline' | 'alert-circle' =
    'sync-circle';
  let colorIcono: string = colors.primaryText;

  if (!configurado) {
    detalle = 'Todavía no está conectado a Supabase. La app funciona solo en este teléfono.';
    accion = 'Ver cómo';
    icono = 'construct';
    colorIcono = colors.textMuted;
  } else if (cargando) {
    detalle = 'Comprobando…';
    accion = '';
  } else if (usuario && !pareja) {
    titulo = 'Falta crear tu pareja';
    detalle = `Cuenta: ${usuario.email ?? 'sin correo'}. Crea la pareja o únete con el código.`;
    accion = 'Continuar';
    icono = 'person-circle';
  } else if (usuario && pareja) {
    const otra = pareja.miembros.find((m) => !m.soy_yo);
    titulo = 'Pareja conectada';
    detalle = otra
      ? `Tú y ${otra.nombre}.`
      : `Código para tu pareja: ${formatearCodigo(pareja.codigo)}`;
    accion = otra ? 'Ver' : 'Ver código';
    icono = 'checkmark-circle';
    colorIcono = colors.positive;
    if (estadoSync === 'decidir') {
      titulo = 'Falta elegir cómo unir';
      detalle = 'Tu pareja y este teléfono ya tienen movimientos. Toca para decidir.';
      accion = 'Elegir';
      icono = 'git-merge';
      colorIcono = colors.warning;
    } else if (estadoSync === 'sincronizando') {
      detalle += ' Sincronizando…';
    } else if (estadoSync === 'sin_conexion') {
      detalle += pendientes > 0 ? ` Sin conexión: ${pendientes} por enviar.` : ' Sin conexión.';
      icono = 'cloud-offline';
      colorIcono = colors.warning;
    } else if (estadoSync === 'error') {
      detalle += ' No se pudo sincronizar.';
      icono = 'alert-circle';
      colorIcono = colors.negative;
    } else if (pendientes > 0) {
      detalle += ` ${pendientes} por enviar.`;
    } else if (estadoSync === 'ok') {
      detalle += ' Todo al día.';
    }
  }

  return (
    <Pressable
      onPress={() => router.push('/sincronizacion')}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. ${detalle}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${colorIcono}22` }]}>
        <Ionicons name={icono} size={26} color={colorIcono} />
      </View>
      <View style={styles.info}>
        <Text style={styles.titulo}>{titulo}</Text>
        <Text style={styles.detalle}>{detalle}</Text>
      </View>
      {accion ? <Text style={styles.accion}>{accion}</Text> : null}
    </Pressable>
  );
}

const crearEstilos = ({ colors, shadows }: Tema) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.85,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  titulo: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  detalle: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  accion: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: colors.primaryText,
  },
});