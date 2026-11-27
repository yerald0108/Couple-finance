import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fontSizes, fonts, radius, spacing } from '../../theme';
import { useEstilos } from '../../theme/useTema';
import type { Tema } from '../../theme/temas';
import { Card } from '../common/Card';
import { Divider } from '../common/Divider';

export interface FilaRanking {
  id: string;
  titulo: string;
  subtitulo?: string;
  /** Monto ya formateado ("$1,200.00"). */
  monto: string;
}

interface RankingCardProps {
  titulo: string;
  filas: FilaRanking[];
  /** Texto pequeño al pie. */
  nota?: string;
}

/** Lista numerada (1, 2, 3…) con un título, un detalle y un monto por fila. */
export function RankingCard({ titulo, filas, nota }: RankingCardProps) {
  const styles = useEstilos(crearEstilos);
  return (
    <Card style={styles.card}>
      <Text style={styles.titulo}>{titulo}</Text>
      {filas.map((fila, i) => (
        <Fragment key={fila.id}>
          {i > 0 ? <Divider /> : null}
          <View style={styles.fila}>
            <View style={styles.posicion}>
              <Text style={styles.posicionTexto}>{i + 1}</Text>
            </View>
            <View style={styles.textos}>
              <Text style={styles.nombre} numberOfLines={1}>
                {fila.titulo}
              </Text>
              {fila.subtitulo ? (
                <Text style={styles.sub} numberOfLines={1}>
                  {fila.subtitulo}
                </Text>
              ) : null}
            </View>
            <Text style={styles.monto}>{fila.monto}</Text>
          </View>
        </Fragment>
      ))}
      {nota ? <Text style={styles.nota}>{nota}</Text> : null}
    </Card>
  );
}

const crearEstilos = ({ colors }: Tema) => StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  titulo: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  posicion: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posicionTexto: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xs,
    color: colors.primaryText,
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  nombre: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  sub: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  monto: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  nota: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});