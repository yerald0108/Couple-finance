import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fontSizes, fonts, radius, spacing } from '../../theme';
import { useEstilos, useTema } from '../../theme/useTema';
import type { Tema } from '../../theme/temas';
import { colorDeSector, iconoDeSector } from '../../theme/iconos';
import type { FilaUsoSector } from '../../utils/analisis';
import { formatMonto } from '../../utils/formatters';
import { Card } from '../common/Card';
import { Divider } from '../common/Divider';

interface UsoSectoresCardProps {
  filas: FilaUsoSector[];
}

/** Si ya se usó casi todo lo repartido, la barra avisa en amarillo. */
const UMBRAL_AVISO = 85;

/** Para cada sector: cuánto se le repartió en el período, cuánto se gastó y cuánto queda libre. */
export function UsoSectoresCard({ filas }: UsoSectoresCardProps) {
  const styles = useEstilos(crearEstilos);
  return (
    <Card style={styles.card}>
      <Text style={styles.titulo}>Uso del dinero por sector</Text>
      {filas.map((fila, i) => (
        <Fragment key={fila.sector_id}>
          {i > 0 ? <Divider /> : null}
          <Fila fila={fila} />
        </Fragment>
      ))}
      <Text style={styles.nota}>
        Compara lo que repartiste a cada sector en este período con lo que gastó. Puede pasar del 100 % si
        gastó dinero que ya tenía de antes.
      </Text>
    </Card>
  );
}

function Fila({ fila }: { fila: FilaUsoSector }) {
  const styles = useEstilos(crearEstilos);
  const { colors } = useTema();
  const color = colorDeSector(fila);
  const pct = fila.porcentajeUsado;
  const excedido = pct !== null && pct > 100;
  const colorBarra = excedido ? colors.negative : pct !== null && pct >= UMBRAL_AVISO ? colors.warning : color;
  const ancho = pct === null ? 0 : Math.max(pct > 0 ? 2 : 0, Math.min(100, pct));
  const hayUsd = fila.repartidoUsd > 0 || fila.gastadoUsd > 0;

  return (
    <View style={styles.fila}>
      <View style={styles.cabecera}>
        <View style={[styles.icono, { backgroundColor: `${color}22` }]}>
          <Ionicons name={iconoDeSector(fila)} size={18} color={color} />
        </View>
        <Text style={styles.nombre} numberOfLines={1}>
          {fila.nombre}
        </Text>
        <Text style={[styles.porcentaje, excedido && styles.porcentajeExceso]}>
          {pct === null ? '—' : `${Math.round(pct)} %`}
        </Text>
      </View>

      <View style={styles.pista}>
        <View style={[styles.relleno, { width: `${ancho}%`, backgroundColor: colorBarra }]} />
      </View>

      <View style={styles.montos}>
        <Text style={styles.monto}>
          Gastado {formatMonto(fila.gastadoCup)} de {formatMonto(fila.repartidoCup)}
        </Text>
      </View>
      <Text style={[styles.libre, fila.libreCup < 0 && styles.libreNegativo]}>
        {pct === null
          ? 'No se repartió dinero en pesos a este sector en este período.'
          : fila.libreCup >= 0
            ? `Libre del repartido: ${formatMonto(fila.libreCup)}`
            : `Gastó ${formatMonto(-fila.libreCup)} más de lo repartido`}
      </Text>

      {hayUsd ? (
        <Text style={[styles.usd, fila.libreUsd < 0 && styles.libreNegativo]}>
          USD: gastado {formatMonto(fila.gastadoUsd, 'USD')} de {formatMonto(fila.repartidoUsd, 'USD')}
        </Text>
      ) : null}
    </View>
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
  porcentaje: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  porcentajeExceso: {
    color: colors.negative,
  },
  pista: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  relleno: {
    height: 8,
    borderRadius: radius.pill,
  },
  montos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monto: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  libre: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  libreNegativo: {
    color: colors.negative,
  },
  usd: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  nota: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    lineHeight: 18,
  },
});