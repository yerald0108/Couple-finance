import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, fonts, radius, spacing } from '../../theme';
import type { Evolucion } from '../../utils/analisis';
import { formatMonto } from '../../utils/formatters';
import { Card } from '../common/Card';

interface EvolucionChartProps {
  evolucion: Evolucion;
}

const ALTO_GRAFICO = 130;

/**
 * Barras con lo gastado en pesos cada día (semana y mes) o cada mes (año). Marca la barra más alta,
 * dibuja una línea con el promedio y, al tocar una barra, muestra su monto.
 */
export function EvolucionChart({ evolucion }: EvolucionChartProps) {
  const [elegida, setElegida] = useState<number | null>(null);
  const { barras, maximoCup, promedioCup, indiceMaximo, tipo } = evolucion;
  const porDia = tipo === 'dia';
  const hayUsd = barras.some((b) => b.usd > 0);
  const lineaPromedio =
    maximoCup > 0 && promedioCup > 0
      ? Math.min(ALTO_GRAFICO, Math.round((promedioCup / maximoCup) * ALTO_GRAFICO))
      : null;

  const barra = elegida !== null ? barras[elegida] : null;
  const detalle = barra
    ? `${barra.etiquetaLarga}: ${formatMonto(barra.cup)}${barra.usd > 0 ? ` · ${formatMonto(barra.usd, 'USD')}` : ''}`
    : maximoCup > 0
      ? `Máximo: ${formatMonto(maximoCup)}`
      : 'Sin gastos en pesos';

  return (
    <Card style={styles.card}>
      <View style={styles.titulos}>
        <Text style={styles.titulo}>{porDia ? 'Gastado cada día' : 'Gastado cada mes'}</Text>
        <Text style={styles.detalle} numberOfLines={1}>
          {detalle}
        </Text>
      </View>

      <View
        accessible
        accessibilityLabel={`Gráfico de gasto ${porDia ? 'diario' : 'mensual'} en pesos. ${
          maximoCup > 0 ? `El más alto fue ${formatMonto(maximoCup)}.` : 'No hubo gastos en pesos.'
        }`}
      >
        <View style={styles.area}>
          {lineaPromedio !== null ? <View style={[styles.promedio, { bottom: lineaPromedio }]} /> : null}
          <View style={styles.barras}>
            {barras.map((b, i) => {
              const alto = maximoCup > 0 ? Math.max(3, Math.round((b.cup / maximoCup) * ALTO_GRAFICO)) : 3;
              const esMaxima = i === indiceMaximo;
              const esElegida = i === elegida;
              let fondo: string = b.cup > 0 ? colors.primary : colors.border;
              if (esMaxima) fondo = colors.warning;
              if (esElegida) fondo = colors.primaryDark;
              return (
                <Pressable
                  key={b.clave}
                  onPress={() => setElegida((actual) => (actual === i ? null : i))}
                  accessibilityRole="button"
                  accessibilityLabel={`${b.etiquetaLarga}, ${formatMonto(b.cup)}`}
                  style={styles.columna}
                >
                  <View style={[styles.barra, { height: alto, backgroundColor: fondo }, b.futura && styles.futura]} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.etiquetas}>
          {barras.map((b) => (
            <View key={b.clave} style={styles.zonaEtiqueta}>
              {b.etiqueta ? <Text style={styles.etiqueta}>{b.etiqueta}</Text> : null}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.leyenda}>
        {indiceMaximo >= 0 ? (
          <View style={styles.leyendaItem}>
            <View style={[styles.cuadro, { backgroundColor: colors.warning }]} />
            <Text style={styles.leyendaTexto}>{porDia ? 'Día' : 'Mes'} de mayor gasto</Text>
          </View>
        ) : null}
        {lineaPromedio !== null ? (
          <View style={styles.leyendaItem}>
            <View style={styles.rayita} />
            <Text style={styles.leyendaTexto}>
              Promedio {formatMonto(promedioCup)} por {porDia ? 'día' : 'mes'}
            </Text>
          </View>
        ) : null}
      </View>

      {hayUsd ? <Text style={styles.nota}>Las barras muestran solo los pesos; el USD va aparte.</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  titulos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  titulo: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  detalle: {
    flexShrink: 1,
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  area: {
    height: ALTO_GRAFICO,
  },
  promedio: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: colors.textMuted,
    opacity: 0.7,
  },
  barras: {
    height: ALTO_GRAFICO,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  columna: {
    flex: 1,
    height: ALTO_GRAFICO,
    justifyContent: 'flex-end',
  },
  barra: {
    width: '100%',
    borderTopLeftRadius: radius.sm / 2,
    borderTopRightRadius: radius.sm / 2,
  },
  futura: {
    opacity: 0.4,
  },
  etiquetas: {
    flexDirection: 'row',
    gap: 2,
    marginTop: spacing.xs,
  },
  zonaEtiqueta: {
    flex: 1,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etiqueta: {
    width: 30,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.textMuted,
  },
  leyenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  leyendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cuadro: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  rayita: {
    width: 14,
    height: 2,
    backgroundColor: colors.textMuted,
  },
  leyendaTexto: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  nota: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
});