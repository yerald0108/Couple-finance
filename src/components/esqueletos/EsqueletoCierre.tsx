import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, shadows, spacing } from '../../theme';
import { Card } from '../common/Card';
import { Divider } from '../common/Divider';
import { Skeleton, SkeletonGroup } from '../common/Skeleton';

/**
 * Esqueleto de carga del cierre de mes (debajo del navegador de meses): tarjeta violeta con la frase y las tres
 * líneas, los sectores, la comparación y el mes en números. Tiene la misma forma que el contenido real.
 * Si cambias el diseño de `app/cierre-mes.tsx`, cambia también este esqueleto.
 */
export function EsqueletoCierre() {
  return (
    <SkeletonGroup>
      <View style={styles.violeta}>
        <Skeleton width={150} height={14} sobreColor />
        <Skeleton height={18} sobreColor />
        <Skeleton width="70%" height={18} sobreColor />
        <View style={styles.lineas}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.linea}>
              <Skeleton width={72} height={18} sobreColor />
              <Skeleton width={110} height={20} sobreColor />
            </View>
          ))}
        </View>
      </View>

      <Card style={styles.tarjeta}>
        <Skeleton width={170} height={14} />
        <Skeleton height={48} radio={radius.md} />
        {[0, 1, 2].map((i) => (
          <Fragment key={i}>
            <Divider />
            <View style={styles.sector}>
              <View style={styles.cabecera}>
                <Skeleton width={36} height={36} radio={radius.pill} />
                <Skeleton width="40%" height={16} />
                <View style={styles.espacio} />
                <Skeleton width={64} height={22} radio={radius.pill} />
              </View>
              <Skeleton height={8} radio={radius.pill} />
              <Skeleton width="75%" height={14} />
              <Skeleton width="55%" height={14} />
            </View>
          </Fragment>
        ))}
      </Card>

      <Card style={styles.tarjeta}>
        <Skeleton width={110} height={14} />
        {[0, 1].map((i) => (
          <View key={i} style={styles.comparacion}>
            <View style={styles.datos}>
              <Skeleton width="50%" height={14} />
              <Skeleton width="40%" height={20} />
              <Skeleton width="35%" height={12} />
            </View>
            <Skeleton width={84} height={36} radio={radius.pill} />
          </View>
        ))}
      </Card>

      <Card style={styles.tarjeta}>
        <Skeleton width={130} height={14} />
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.numero}>
            <Skeleton width="45%" height={14} />
            <Skeleton width="30%" height={14} />
          </View>
        ))}
      </Card>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  violeta: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.card,
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
  },
  tarjeta: {
    gap: spacing.md,
  },
  sector: {
    gap: spacing.sm,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  espacio: {
    flex: 1,
  },
  comparacion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  datos: {
    flex: 1,
    gap: spacing.xs,
  },
  numero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
});