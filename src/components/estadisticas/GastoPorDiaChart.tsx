import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, fonts, radius, spacing } from '../../theme';
import type { FilaDia } from '../../utils/estadisticas';
import type { Periodo } from '../../utils/fechas';
import { formatMonto } from '../../utils/formatters';
import { Card } from '../common/Card';

interface GastoPorDiaChartProps {
  periodo: Exclude<Periodo, 'dia'>;
  dias: FilaDia[];
}

const ALTO_GRAFICO = 120;
/** Lunes a domingo (los días de la semana empiezan en lunes). */
const INICIALES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Columnas con lo gastado en pesos cada día de la semana o del mes. */
export function GastoPorDiaChart({ periodo, dias }: GastoPorDiaChartProps) {
  const maximo = dias.reduce((m, d) => Math.max(m, d.cup), 0);
  const hayUsd = dias.some((d) => d.usd > 0);
  const delMes = periodo === 'mes';

  return (
    <Card style={styles.card}>
      <View style={styles.titulos}>
        <Text style={styles.titulo}>Gastado cada día</Text>
        <Text style={styles.maximo}>
          {maximo > 0 ? `Máximo: ${formatMonto(maximo)}` : 'Sin gastos en pesos'}
        </Text>
      </View>

      <View
        style={styles.grafico}
        accessible
        accessibilityLabel={`Gráfico de gasto diario en pesos. ${
          maximo > 0 ? `El día más alto fue ${formatMonto(maximo)}.` : 'No hubo gastos en pesos.'
        }`}
      >
        {dias.map((d) => {
          const alto = maximo > 0 ? Math.max(3, Math.round((d.cup / maximo) * ALTO_GRAFICO)) : 3;
          const etiqueta = delMes ? (d.dia === 1 || d.dia % 5 === 0 ? String(d.dia) : '') : INICIALES[d.diaSemana];
          return (
            <View key={d.clave} style={styles.columna}>
              <View style={styles.zonaBarra}>
                <View
                  style={[
                    styles.barra,
                    { height: alto, backgroundColor: d.cup > 0 ? colors.primary : colors.border },
                  ]}
                />
              </View>
              <View style={styles.zonaEtiqueta}>
                {etiqueta ? <Text style={styles.etiqueta}>{etiqueta}</Text> : null}
              </View>
            </View>
          );
        })}
      </View>

      {hayUsd ? (
        <Text style={styles.nota}>Las columnas muestran solo los pesos; el USD va aparte.</Text>
      ) : null}
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
  maximo: {
    fontFamily: fonts.medium,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  grafico: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  columna: {
    flex: 1,
    alignItems: 'center',
  },
  zonaBarra: {
    height: ALTO_GRAFICO,
    width: '100%',
    justifyContent: 'flex-end',
  },
  barra: {
    width: '100%',
    borderTopLeftRadius: radius.sm / 2,
    borderTopRightRadius: radius.sm / 2,
  },
  zonaEtiqueta: {
    height: 18,
    marginTop: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etiqueta: {
    width: 28,
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.textMuted,
  },
  nota: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
});