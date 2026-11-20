import { StyleSheet, Text, View } from 'react-native';
import type { Notificacion } from '../../db/queries/notificaciones';
import { colors, fontSizes, fonts, radius, spacing } from '../../theme';
import {
  detalleNotificacion,
  esIngreso,
  fraseNotificacion,
  inicialDe,
  montoConSigno,
  textoReciente,
  type Autor,
} from '../../utils/notificaciones';
import { FilaPulsable } from '../common/FilaPulsable';

interface NotificacionItemProps {
  notificacion: Notificacion;
  autor: Autor;
  /** Se marca con un punto y un fondo suave (llegó desde la última vez que miraste). */
  nuevo: boolean;
  onPress: () => void;
}

/** Una notificación: quién lo registró, qué fue, cuándo y el monto. Al tocarla se abre el detalle. */
export function NotificacionItem({ notificacion, autor, nuevo, onPress }: NotificacionItemProps) {
  const frase = fraseNotificacion(notificacion, autor);
  const detalle = detalleNotificacion(notificacion);
  const monto = montoConSigno(notificacion);

  return (
    <FilaPulsable
      onPress={onPress}
      etiqueta={`${nuevo ? 'Nueva. ' : ''}${frase}. ${detalle}. ${monto}`}
      pista="Toca para ver el detalle"
    >
      <View style={[styles.fila, nuevo && styles.nueva]}>
        <View style={[styles.avatar, autor.esYo && styles.avatarYo]}>
          <Text style={[styles.inicial, autor.esYo && styles.inicialYo]}>{inicialDe(autor)}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.frase} numberOfLines={2}>
            {frase}
          </Text>
          <Text style={styles.detalle} numberOfLines={2}>
            {detalle}
          </Text>
          <Text style={styles.hora}>{textoReciente(notificacion.created_at)}</Text>
        </View>
        <View style={styles.derecha}>
          <Text style={[styles.monto, { color: esIngreso(notificacion) ? colors.positive : colors.negative }]}>
            {monto}
          </Text>
          {nuevo ? <View style={styles.punto} /> : null}
        </View>
      </View>
    </FilaPulsable>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  nueva: {
    backgroundColor: colors.primarySoft,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarYo: {
    backgroundColor: colors.primarySoft,
  },
  inicial: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  inicialYo: {
    color: colors.primary,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  frase: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  detalle: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  hora: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  derecha: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  monto: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
  },
  punto: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
});