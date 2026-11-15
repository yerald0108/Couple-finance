import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, fonts, radius, spacing } from '../../theme';
import type { AnalisisPeriodo } from '../../utils/analisis';
import type { Periodo } from '../../utils/fechas';
import { formatMonto } from '../../utils/formatters';
import { Card } from '../common/Card';

interface AnalisisCardProps {
  analisis: AnalisisPeriodo;
  periodo: Periodo;
}

interface Dato {
  id: string;
  etiqueta: string;
  valor: string;
  detalle?: string;
}

/** Análisis del período: estimación de cierre de mes, mensajes automáticos y datos clave (promedios, extremos). */
export function AnalisisCard({ analisis, periodo }: AnalisisCardProps) {
  const { estimacion, insights, detalle, evolucion } = analisis;
  const porMes = evolucion?.tipo === 'mes';
  const unidad = porMes ? 'mes' : 'día';

  const datos: Dato[] = [];
  if (evolucion) {
    datos.push({
      id: 'promedio',
      etiqueta: `Promedio por ${unidad}`,
      valor: formatMonto(evolucion.promedioCup),
      detalle: 'Solo pesos',
    });
  }
  const totalTransacciones = detalle.transaccionesCup + detalle.transaccionesUsd;
  if (totalTransacciones > 0) {
    datos.push({
      id: 'transacciones',
      etiqueta: 'Gastos registrados',
      valor: String(totalTransacciones),
      detalle: detalle.transaccionesUsd > 0 ? `${detalle.transaccionesUsd} en USD` : undefined,
    });
  }
  if (detalle.promedioPorTransaccionCup !== null) {
    datos.push({
      id: 'promedio_gasto',
      etiqueta: 'Promedio por gasto',
      valor: formatMonto(detalle.promedioPorTransaccionCup),
      detalle: 'Solo pesos',
    });
  }
  if (detalle.mayor) {
    datos.push({
      id: 'mayor',
      etiqueta: `${porMes ? 'Mes' : 'Día'} de mayor gasto`,
      valor: formatMonto(detalle.mayor.cup),
      detalle: detalle.mayor.etiqueta,
    });
  }
  if (detalle.menor) {
    datos.push({
      id: 'menor',
      etiqueta: `${porMes ? 'Mes' : 'Día'} de menor gasto`,
      valor: formatMonto(detalle.menor.cup),
      detalle: `${detalle.menor.etiqueta} · el menor con gastos`,
    });
  }
  if (detalle.sinGasto !== null && periodo !== 'dia') {
    datos.push({
      id: 'sin_gasto',
      etiqueta: `${porMes ? 'Meses' : 'Días'} sin gastos`,
      valor: String(detalle.sinGasto),
      detalle: 'En pesos',
    });
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.titulo}>Análisis del período</Text>

      {estimacion ? (
        <View style={styles.estimacion}>
          <View style={styles.estimacionCabecera}>
            <Ionicons name="analytics" size={18} color={colors.primary} />
            <Text style={styles.estimacionEtiqueta}>Estimación de cierre de mes</Text>
          </View>
          <Text style={styles.estimacionMonto}>{formatMonto(estimacion.cierreCup)}</Text>
          <Text style={styles.estimacionTexto}>
            Gastas {formatMonto(estimacion.ritmoDiarioCup)} por día; si sigues así, el mes cerraría con ese total
            en gastos de pesos ({estimacion.diasTranscurridos} de {estimacion.diasDelMes} días transcurridos).
          </Text>
          {estimacion.superaIngresos ? (
            <Text style={styles.estimacionAlerta}>Eso superaría lo que has ingresado este mes.</Text>
          ) : null}
          <Text style={styles.estimacionNota}>Es solo una estimación: cambia según cómo gastes los próximos días.</Text>
        </View>
      ) : null}

      {insights.length > 0 ? (
        <View style={styles.insights}>
          {insights.map((insight) => (
            <View key={insight.id} style={styles.insight}>
              <Ionicons
                name={insight.tono === 'alerta' ? 'warning' : 'information-circle'}
                size={20}
                color={insight.tono === 'alerta' ? colors.warning : colors.primary}
              />
              <Text style={styles.insightTexto}>{insight.texto}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {datos.length > 0 ? (
        <View style={styles.grid}>
          {datos.map((dato) => (
            <View key={dato.id} style={styles.dato}>
              <Text style={styles.datoEtiqueta}>{dato.etiqueta}</Text>
              <Text style={styles.datoValor} numberOfLines={1} adjustsFontSizeToFit>
                {dato.valor}
              </Text>
              {dato.detalle ? <Text style={styles.datoDetalle}>{dato.detalle}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  titulo: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  estimacion: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  estimacionCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  estimacionEtiqueta: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: colors.primaryDark,
  },
  estimacionMonto: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xxl,
    color: colors.text,
  },
  estimacionTexto: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  estimacionAlerta: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: colors.negative,
  },
  estimacionNota: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  insights: {
    gap: spacing.md,
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  insightTexto: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: fontSizes.sm,
    color: colors.text,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  dato: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
  },
  datoEtiqueta: {
    fontFamily: fonts.medium,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  datoValor: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.lg,
    color: colors.text,
  },
  datoDetalle: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
});