import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fontSizes, fonts, radius, spacing } from '../../theme';
import { useEstilos } from '../../theme/useTema';
import type { Tema } from '../../theme/temas';
import type { IconName } from '../../theme/iconos';
import { formatMonto } from '../../utils/formatters';
import { Card } from '../common/Card';
import { DonaChart } from './DonaChart';

export interface FilaDona {
  id: string;
  nombre: string;
  color: string;
  icono: IconName;
  /** Gastado en pesos (esto es lo que se dibuja en la dona). */
  cup: number;
  /** Gastado en USD (aparte, no entra en la dona). */
  usd: number;
  /** Parte de los gastos en pesos (0–100). */
  porcentaje: number;
}

interface DonaCardProps {
  titulo: string;
  filas: FilaDona[];
  /** Total gastado en pesos (centro de la dona cuando no hay nada elegido). */
  totalCup: number;
  /** Texto pequeño al pie (por ejemplo, que el USD va aparte). */
  nota?: string;
}

/** Dona con la parte de cada fila en los gastos en pesos, y debajo la leyenda. Tocar una porción o una fila la resalta. */
export function DonaCard({ titulo, filas, totalCup, nota }: DonaCardProps) {
  const styles = useEstilos(crearEstilos);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const elegida = filas.find((f) => f.id === seleccionadoId && f.cup > 0) ?? null;
  const hayPesos = filas.some((f) => f.cup > 0);

  return (
    <Card style={styles.card}>
      <Text style={styles.titulo}>{titulo}</Text>

      <DonaChart
        segmentos={filas.map((f) => ({ id: f.id, color: f.color, valor: f.cup }))}
        seleccionadoId={elegida ? elegida.id : null}
        onSeleccionar={setSeleccionadoId}
      >
        {elegida ? (
          <>
            <Text style={styles.centroEtiqueta} numberOfLines={1}>
              {elegida.nombre}
            </Text>
            <Text style={styles.centroMonto} numberOfLines={1} adjustsFontSizeToFit>
              {formatMonto(elegida.cup)}
            </Text>
            <Text style={styles.centroEtiqueta}>{Math.round(elegida.porcentaje)} %</Text>
          </>
        ) : hayPesos ? (
          <>
            <Text style={styles.centroEtiqueta}>Gastado</Text>
            <Text style={styles.centroMonto} numberOfLines={1} adjustsFontSizeToFit>
              {formatMonto(totalCup)}
            </Text>
          </>
        ) : (
          <Text style={styles.centroEtiqueta}>Sin gastos en pesos</Text>
        )}
      </DonaChart>

      <View style={styles.leyenda}>
        {filas.map((fila) => (
          <Leyenda
            key={fila.id}
            fila={fila}
            elegida={fila.id === elegida?.id}
            onPress={() => setSeleccionadoId((actual) => (actual === fila.id ? null : fila.id))}
          />
        ))}
      </View>

      {nota ? <Text style={styles.nota}>{nota}</Text> : null}
    </Card>
  );
}

function Leyenda({ fila, elegida, onPress }: { fila: FilaDona; elegida: boolean; onPress: () => void }) {
  const styles = useEstilos(crearEstilos);
  const soloUsd = fila.cup === 0 && fila.usd > 0;
  const vacia = fila.cup === 0 && fila.usd === 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={fila.cup === 0}
      accessibilityRole="button"
      accessibilityLabel={`${fila.nombre}, ${soloUsd ? formatMonto(fila.usd, 'USD') : formatMonto(fila.cup)}`}
      style={[styles.fila, elegida && styles.filaElegida]}
    >
      <View style={[styles.icono, { backgroundColor: `${fila.color}22` }]}>
        <Ionicons name={fila.icono} size={18} color={fila.color} />
      </View>
      <View style={styles.nombreWrap}>
        <Text style={styles.nombre} numberOfLines={1}>
          {fila.nombre}
        </Text>
        {soloUsd ? <Text style={styles.sub}>USD · aparte, no entra en la dona</Text> : null}
      </View>
      <View style={styles.montos}>
        <Text style={[styles.monto, vacia && styles.montoVacio]}>
          {soloUsd ? formatMonto(fila.usd, 'USD') : formatMonto(fila.cup)}
        </Text>
        {!soloUsd && fila.usd > 0 ? <Text style={styles.montoUsd}>{formatMonto(fila.usd, 'USD')}</Text> : null}
      </View>
      <Text style={styles.porcentaje}>{fila.cup > 0 ? `${Math.round(fila.porcentaje)}%` : ''}</Text>
      <View style={[styles.punto, { backgroundColor: fila.cup > 0 ? fila.color : 'transparent' }]} />
    </Pressable>
  );
}

const crearEstilos = ({ colors }: Tema) => StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  titulo: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  centroEtiqueta: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  centroMonto: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xl,
    color: colors.text,
    textAlign: 'center',
  },
  leyenda: {
    gap: spacing.xs,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  filaElegida: {
    backgroundColor: colors.primarySoft,
  },
  icono: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nombreWrap: {
    flex: 1,
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
  montos: {
    alignItems: 'flex-end',
  },
  monto: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  montoVacio: {
    color: colors.textMuted,
  },
  montoUsd: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  porcentaje: {
    width: 40,
    textAlign: 'right',
    fontFamily: fonts.semibold,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  punto: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
  },
  nota: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});