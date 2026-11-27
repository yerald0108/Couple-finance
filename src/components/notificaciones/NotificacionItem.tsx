import { StyleSheet, Text, View } from 'react-native';
import { fontSizes, fonts, radius, spacing } from '../../theme';
import { useEstilos, useTema } from '../../theme/useTema';
import type { Tema } from '../../theme/temas';
import {
  detalleNotificacion,
  esIngreso,
  fraseNotificacion,
  inicialDe,
  montoConSigno,
  textoReciente,
  type Autor,
  type DatosNotificacion,
} from '../../utils/notificaciones';
import { FilaPulsable } from '../common/FilaPulsable';

interface NotificacionItemProps {
  /** Un movimiento (una notificación o una fila del historial): lo que se necesita para dibujarlo. */
  notificacion: DatosNotificacion & { created_at: string };
  autor: Autor;
  /** Se marca con un punto y un fondo suave (llegó desde la última vez que miraste). */
  nuevo: boolean;
  onPress: () => void;
  /** Texto de "cuándo" ya armado. Si no se pasa, se muestra "hace 5 min" / "12 nov, 5:51 PM" según `created_at`. */
  cuando?: string;
  /** true = sin relleno a los lados, para filas que ya van dentro de una lista con su propio margen (`PantallaLista`). */
  sinRelleno?: boolean;
}

/** Una notificación: quién lo registró, qué fue, cuándo y el monto. Al tocarla se abre el detalle. También es la fila del historial. */
export function NotificacionItem({ notificacion, autor, nuevo, onPress, cuando, sinRelleno }: NotificacionItemProps) {
  const styles = useEstilos(crearEstilos);
  const { colors } = useTema();
  const frase = fraseNotificacion(notificacion, autor);
  const detalle = detalleNotificacion(notificacion);
  const monto = montoConSigno(notificacion);

  return (
    <FilaPulsable
      onPress={onPress}
      etiqueta={`${nuevo ? 'Nueva. ' : ''}${frase}. ${detalle}. ${monto}`}
      pista="Toca para ver el detalle"
    >
      <View style={[styles.fila, sinRelleno && styles.sinRelleno, nuevo && styles.nueva]}>
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
          <Text style={styles.hora}>{cuando ?? textoReciente(notificacion.created_at)}</Text>
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

const crearEstilos = ({ colors }: Tema) => StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  sinRelleno: {
    paddingHorizontal: 0,
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
    color: colors.primaryText,
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