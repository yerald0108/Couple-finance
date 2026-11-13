import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, fonts, radius, spacing } from '../../theme';
import type { IconName } from '../../theme/iconos';
import { formatMonto } from '../../utils/formatters';
import { Card } from '../common/Card';
import { Divider } from '../common/Divider';

export interface FilaDesglose {
  id: string;
  nombre: string;
  color: string;
  icono: IconName;
  /** Gastado en pesos. */
  cup: number;
  /** Gastado en USD (aparte). */
  usd: number;
  /** Parte del total en pesos (0–100) para la barra. */
  porcentaje: number;
}

interface DesgloseCardProps {
  titulo: string;
  filas: FilaDesglose[];
  /** Texto pequeño al pie (por ejemplo, que el USD va aparte). */
  nota?: string;
}

/** Lista de filas con una barra horizontal de color que muestra qué parte del gasto en pesos es cada una. */
export function DesgloseCard({ titulo, filas, nota }: DesgloseCardProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.titulo}>{titulo}</Text>
      {filas.map((fila, i) => (
        <Fragment key={fila.id}>
          {i > 0 ? <Divider /> : null}
          <Fila fila={fila} />
        </Fragment>
      ))}
      {nota ? <Text style={styles.nota}>{nota}</Text> : null}
    </Card>
  );
}

function Fila({ fila }: { fila: FilaDesglose }) {
  const soloUsd = fila.cup === 0 && fila.usd > 0;
  const hayBarra = fila.cup > 0;
  // Una barra muy corta se ve como una raya: se le da un mínimo para que se note.
  const ancho = Math.max(2, Math.min(100, fila.porcentaje));

  return (
    <View style={styles.fila}>
      <View style={styles.cabecera}>
        <View style={[styles.icono, { backgroundColor: `${fila.color}22` }]}>
          <Ionicons name={fila.icono} size={18} color={fila.color} />
        </View>
        <Text style={styles.nombre} numberOfLines={1}>
          {fila.nombre}
        </Text>
        <View style={styles.montos}>
          <Text style={styles.monto}>
            {soloUsd ? formatMonto(fila.usd, 'USD') : formatMonto(fila.cup)}
          </Text>
          {!soloUsd && fila.usd > 0 ? (
            <Text style={styles.montoUsd}>{formatMonto(fila.usd, 'USD')}</Text>
          ) : null}
        </View>
      </View>

      {hayBarra ? (
        <View style={styles.barraFila}>
          <View style={styles.pista}>
            <View style={[styles.relleno, { width: `${ancho}%`, backgroundColor: fila.color }]} />
          </View>
          <Text style={styles.porcentaje}>{Math.round(fila.porcentaje)}%</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  titulo: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  fila: {
    gap: spacing.sm,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icono: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nombre: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  montos: {
    alignItems: 'flex-end',
  },
  monto: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  montoUsd: {
    fontFamily: fonts.medium,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  barraFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pista: {
    flex: 1,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  relleno: {
    height: 8,
    borderRadius: radius.pill,
  },
  porcentaje: {
    width: 40,
    textAlign: 'right',
    fontFamily: fonts.semibold,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  nota: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});