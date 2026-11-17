import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useSyncStore } from '../../store/useSyncStore';
import { textoHace } from '../../sync/sesionSync';
import { colors, fontSizes, fonts, spacing } from '../../theme';
import { Button } from '../common/Button';
import { Card } from '../common/Card';

/** Cómo va la sincronización: estado, cambios sin enviar, última vez y botón "Sincronizar ahora". */
export function EstadoSincronizacion() {
  const db = useSQLiteContext();
  const estado = useSyncStore((s) => s.estado);
  const pendientes = useSyncStore((s) => s.pendientes);
  const ultimaSync = useSyncStore((s) => s.ultimaSync);
  const error = useSyncStore((s) => s.error);
  const sincronizar = useSyncStore((s) => s.sincronizar);

  const sincronizando = estado === 'sincronizando';

  let titulo = 'Al día';
  let icono: 'checkmark-circle' | 'sync' | 'cloud-offline' | 'alert-circle' = 'checkmark-circle';
  let color: string = colors.positive;
  if (sincronizando) {
    titulo = 'Sincronizando…';
    icono = 'sync';
    color = colors.primary;
  } else if (estado === 'sin_conexion') {
    titulo = 'Sin conexión';
    icono = 'cloud-offline';
    color = colors.warning;
  } else if (estado === 'error') {
    titulo = 'No se pudo sincronizar';
    icono = 'alert-circle';
    color = colors.negative;
  } else if (pendientes > 0) {
    titulo = 'Cambios por enviar';
    icono = 'sync';
    color = colors.warning;
  }

  const lineaPendientes =
    pendientes > 0
      ? `${pendientes} ${pendientes === 1 ? 'cambio sin enviar' : 'cambios sin enviar'} a tu pareja.`
      : 'No hay cambios sin enviar.';

  return (
    <Card style={styles.card}>
      <View style={styles.cabecera}>
        <Ionicons name={icono} size={24} color={color} />
        <Text style={styles.titulo}>{titulo}</Text>
      </View>
      {estado === 'sin_conexion' ? (
        <Text style={styles.texto}>
          Sin internet la app sigue funcionando. Todo lo que registres se enviará cuando haya conexión.
        </Text>
      ) : null}
      {estado === 'error' && error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.texto}>{lineaPendientes}</Text>
      <Text style={styles.texto}>Última sincronización: {textoHace(ultimaSync)}.</Text>
      <Button
        title="Sincronizar ahora"
        variant="secondary"
        icon="sync"
        onPress={() => void sincronizar(db)}
        loading={sincronizando}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titulo: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.lg,
    color: colors.text,
  },
  texto: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: fontSizes.sm,
    color: colors.negative,
    lineHeight: 20,
  },
});