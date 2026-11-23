import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSizes, fonts, radius, spacing } from '../../theme';
import { colorDeSector, iconoDeSector } from '../../theme/iconos';
import type { EstadoSector, SectorCierre } from '../../utils/cierreMes';
import { Card } from '../common/Card';
import { Divider } from '../common/Divider';

interface SectoresCierreCardProps {
  sectores: SectorCierre[];
  /** "Gustos se pasó…" / "Ningún sector se pasó…" */
  resumen: string;
  /** Cuántos se pasaron (para el color del aviso). */
  cuantosSePasaron: number;
}

/** Si ya se usó casi todo lo repartido, la barra avisa en amarillo. */
const UMBRAL_AVISO = 85;

const PASTILLA: Record<EstadoSector, { texto: string; color: string }> = {
  se_paso: { texto: 'Se pasó', color: colors.negative },
  sin_reparto: { texto: 'Sin reparto', color: colors.warning },
  dentro: { texto: 'Dentro', color: colors.positive },
};

/** Cómo le fue a cada sector: lo repartido contra lo gastado, quién se pasó y lo que quedó al terminar el mes. */
export function SectoresCierreCard({ sectores, resumen, cuantosSePasaron }: SectoresCierreCardProps) {
  const alerta = cuantosSePasaron > 0;

  return (
    <Card style={styles.card}>
      <Text style={styles.titulo}>Cómo le fue a cada sector</Text>

      <View style={[styles.aviso, { backgroundColor: alerta ? `${colors.negative}14` : `${colors.positive}14` }]}>
        <Ionicons
          name={alerta ? 'alert-circle' : 'checkmark-circle'}
          size={22}
          color={alerta ? colors.negative : colors.positive}
        />
        <Text style={[styles.avisoTexto, { color: alerta ? colors.negative : colors.positive }]}>{resumen}</Text>
      </View>

      {sectores.map((sector) => (
        <Fragment key={sector.sector_id}>
          <Divider />
          <Fila sector={sector} />
        </Fragment>
      ))}

      <Text style={styles.nota}>
        Se compara lo que se repartió a cada sector este mes con lo que gastó. «Se pasó» no siempre es grave:
        puede haber usado dinero que le quedaba de meses anteriores.
      </Text>
    </Card>
  );
}

function Fila({ sector }: { sector: SectorCierre }) {
  const color = colorDeSector(sector);
  const pastilla = PASTILLA[sector.estado];
  const pct = sector.porcentajeUsado;
  const excedido = pct !== null && pct > 100;
  const colorBarra = excedido ? colors.negative : pct !== null && pct >= UMBRAL_AVISO ? colors.warning : color;
  const ancho = pct === null ? 0 : Math.max(pct > 0 ? 2 : 0, Math.min(100, pct));

  return (
    <View style={styles.fila} accessible accessibilityLabel={`${sector.nombre}. ${pastilla.texto}. ${sector.lineas.map((l) => l.texto).join(' ')}`}>
      <View style={styles.cabecera}>
        <View style={[styles.icono, { backgroundColor: `${color}22` }]}>
          <Ionicons name={iconoDeSector(sector)} size={18} color={color} />
        </View>
        <Text style={styles.nombre} numberOfLines={1}>
          {sector.nombre}
        </Text>
        <View style={[styles.pastilla, { backgroundColor: `${pastilla.color}1A` }]}>
          <Text style={[styles.pastillaTexto, { color: pastilla.color }]}>{pastilla.texto}</Text>
        </View>
      </View>

      <View style={styles.pista}>
        <View style={[styles.relleno, { width: `${ancho}%`, backgroundColor: colorBarra }]} />
      </View>

      <View style={styles.lineas}>
        {sector.lineas.map((linea, i) => (
          <Text key={i} style={[i === 0 ? styles.lineaPrincipal : styles.linea, linea.mala && styles.lineaMala]}>
            {linea.texto}
          </Text>
        ))}
      </View>
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
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  avisoTexto: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: fontSizes.md,
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
  pastilla: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  pastillaTexto: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xs,
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
  lineas: {
    gap: 2,
  },
  lineaPrincipal: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  linea: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  lineaMala: {
    color: colors.negative,
  },
  nota: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    lineHeight: 18,
  },
});