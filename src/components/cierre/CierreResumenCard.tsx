import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSizes, fonts, radius, shadows, spacing } from '../../theme';
import type { ResumenPeriodo } from '../../utils/analisis';
import type { TitularCierre } from '../../utils/cierreMes';
import { formatMonto } from '../../utils/formatters';

interface CierreResumenCardProps {
  /** "Octubre 2026" */
  etiqueta: string;
  resumen: ResumenPeriodo;
  titular: TitularCierre;
}

const ICONO_TITULAR = {
  bien: 'checkmark-circle',
  atencion: 'information-circle',
  mal: 'alert-circle',
} as const;

/** Tarjeta principal del cierre: la frase del mes y tres líneas grandes: lo que entró, lo que salió y lo que quedó. */
export function CierreResumenCard({ etiqueta, resumen, titular }: CierreResumenCardProps) {
  const { ingresos, gastos, balance } = resumen;
  const hayUsd = ingresos.usd > 0 || gastos.usd > 0;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Así cerró {etiqueta}</Text>

      <View style={styles.titular}>
        <Ionicons name={ICONO_TITULAR[titular.tono]} size={22} color={colors.surface} />
        <Text style={styles.titularTexto}>{titular.texto}</Text>
      </View>

      <View style={styles.lineas}>
        <Linea icono="arrow-down-circle" nombre="Entró" valor={formatMonto(ingresos.cup)} />
        <Linea icono="arrow-up-circle" nombre="Salió" valor={formatMonto(gastos.cup)} />
        <View style={styles.separador} />
        <Linea
          icono={balance.cup < 0 ? 'alert-circle' : 'checkmark-circle'}
          nombre="Quedó"
          valor={formatMonto(balance.cup)}
          grande
          negativo={balance.cup < 0}
        />
      </View>
      <Text style={styles.caption}>Quedó = lo que entró menos lo que salió · efectivo + transferencia (pesos)</Text>

      {hayUsd ? (
        <View style={styles.usd}>
          <Text style={styles.usdTitulo}>USD aparte</Text>
          <Linea icono="arrow-down-circle" nombre="Entró" valor={formatMonto(ingresos.usd, 'USD')} pequena />
          <Linea icono="arrow-up-circle" nombre="Salió" valor={formatMonto(gastos.usd, 'USD')} pequena />
          <Linea
            icono={balance.usd < 0 ? 'alert-circle' : 'checkmark-circle'}
            nombre="Quedó"
            valor={formatMonto(balance.usd, 'USD')}
            pequena
            negativo={balance.usd < 0}
          />
        </View>
      ) : null}
    </View>
  );
}

interface LineaProps {
  icono: 'arrow-down-circle' | 'arrow-up-circle' | 'checkmark-circle' | 'alert-circle';
  nombre: string;
  valor: string;
  grande?: boolean;
  pequena?: boolean;
  negativo?: boolean;
}

function Linea({ icono, nombre, valor, grande = false, pequena = false, negativo = false }: LineaProps) {
  return (
    <View style={styles.linea} accessible accessibilityLabel={`${nombre} ${valor}`}>
      <View style={styles.lineaNombre}>
        <Ionicons name={icono} size={pequena ? 16 : 20} color="rgba(255,255,255,0.9)" />
        <Text style={[styles.nombre, pequena && styles.nombrePequeno]}>{nombre}</Text>
      </View>
      <Text
        style={[styles.valor, grande && styles.valorGrande, pequena && styles.valorPequeno, negativo && styles.negativo]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {valor}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.card,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  titular: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  titularTexto: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: fontSizes.lg,
    lineHeight: 26,
    color: colors.surface,
  },
  lineas: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  linea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  lineaNombre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nombre: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: 'rgba(255,255,255,0.9)',
  },
  nombrePequeno: {
    fontSize: fontSizes.sm,
  },
  valor: {
    flexShrink: 1,
    fontFamily: fonts.bold,
    fontSize: fontSizes.xl,
    color: colors.surface,
  },
  valorGrande: {
    fontSize: 30,
  },
  valorPequeno: {
    fontSize: fontSizes.md,
  },
  negativo: {
    color: '#FFD0D0',
  },
  separador: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  usd: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  usdTitulo: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.9)',
  },
});