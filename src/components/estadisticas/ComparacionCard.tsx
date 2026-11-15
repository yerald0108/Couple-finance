import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, fonts, radius, spacing } from '../../theme';
import type { ComparacionPeriodo, Variacion } from '../../utils/analisis';
import { formatMonto } from '../../utils/formatters';
import type { Moneda } from '../../types';
import { Card } from '../common/Card';
import { Divider } from '../common/Divider';

interface ComparacionCardProps {
  comparacion: ComparacionPeriodo;
  /** Con qué se compara ("Octubre 2026", "1 – 13 oct 2026"…). */
  etiquetaAnterior: string;
  /** true = solo se comparan los mismos primeros días del período anterior. */
  parcial: boolean;
}

interface FilaDef {
  id: string;
  nombre: string;
  variacion: Variacion;
  moneda: Moneda;
  /** true = que suba es malo (gastos). */
  subirEsMalo: boolean;
}

/** "+18 %" o "−18 %" (con el signo menos de verdad). */
function textoCambio(cambio: number): string {
  const r = Math.round(Math.abs(cambio));
  return `${cambio >= 0 ? '+' : '−'}${r} %`;
}

/** Cuánto cambió cada cosa respecto al período anterior (o al mismo tramo de él). */
export function ComparacionCard({ comparacion, etiquetaAnterior, parcial }: ComparacionCardProps) {
  const todas: FilaDef[] = [
    { id: 'gastos_cup', nombre: 'Gastos en pesos', variacion: comparacion.gastosCup, moneda: 'CUP', subirEsMalo: true },
    { id: 'ingresos_cup', nombre: 'Ingresos en pesos', variacion: comparacion.ingresosCup, moneda: 'CUP', subirEsMalo: false },
    { id: 'gastos_usd', nombre: 'Gastos en USD', variacion: comparacion.gastosUsd, moneda: 'USD', subirEsMalo: true },
    { id: 'ingresos_usd', nombre: 'Ingresos en USD', variacion: comparacion.ingresosUsd, moneda: 'USD', subirEsMalo: false },
  ];
  const filas = todas.filter((f) => f.variacion.tendencia !== 'sin_datos');

  return (
    <Card style={styles.card}>
      <View style={styles.cabecera}>
        <Text style={styles.titulo}>Comparación</Text>
        <Text style={styles.subtitulo}>
          {parcial ? `Mismo tramo: ${etiquetaAnterior}` : `Contra ${etiquetaAnterior}`}
        </Text>
      </View>

      {filas.map((fila, i) => (
        <Fragment key={fila.id}>
          {i > 0 ? <Divider /> : null}
          <Fila fila={fila} />
        </Fragment>
      ))}
    </Card>
  );
}

function Fila({ fila }: { fila: FilaDef }) {
  const { variacion, moneda, subirEsMalo } = fila;
  const { tendencia, cambio } = variacion;

  let color: string = colors.textSecondary;
  let icono: 'trending-up' | 'trending-down' | 'remove' | 'sparkles' = 'remove';
  let texto = 'Igual';

  if (tendencia === 'sube' && cambio !== null) {
    color = subirEsMalo ? colors.negative : colors.positive;
    icono = 'trending-up';
    texto = textoCambio(cambio);
  } else if (tendencia === 'baja' && cambio !== null) {
    color = subirEsMalo ? colors.positive : colors.negative;
    icono = 'trending-down';
    texto = textoCambio(cambio);
  } else if (tendencia === 'nuevo') {
    icono = 'sparkles';
    texto = 'Nuevo';
  }

  return (
    <View style={styles.fila}>
      <View style={styles.datos}>
        <Text style={styles.nombre}>{fila.nombre}</Text>
        <Text style={styles.monto}>{formatMonto(variacion.actual, moneda)}</Text>
        <Text style={styles.antes}>Antes: {formatMonto(variacion.anterior, moneda)}</Text>
      </View>
      <View style={[styles.pastilla, { backgroundColor: `${color}1A` }]}>
        <Ionicons name={icono} size={16} color={color} />
        <Text style={[styles.pastillaTexto, { color }]}>{texto}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  cabecera: {
    gap: spacing.xs,
  },
  titulo: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  subtitulo: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  datos: {
    flex: 1,
    gap: 2,
  },
  nombre: {
    fontFamily: fonts.medium,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  monto: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.text,
  },
  antes: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  pastilla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    minWidth: 84,
    justifyContent: 'center',
  },
  pastillaTexto: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.sm,
  },
});