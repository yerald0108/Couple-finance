import { Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { radius, spacing } from '../../theme';
import { useEstilos } from '../../theme/useTema';
import type { Tema } from '../../theme/temas';
import { Card } from '../common/Card';
import { Divider } from '../common/Divider';
import { SectionTitle } from '../common/SectionTitle';
import { Skeleton, SkeletonGroup } from '../common/Skeleton';

/**
 * Esqueletos de carga: tienen la misma forma y el mismo tamaño que el contenido real de cada pantalla,
 * para que al terminar de cargar nada se mueva. Los títulos fijos ("Mis cuentas"…) se dibujan de verdad;
 * solo se sustituye lo que depende de los datos.
 *
 * Si cambias el diseño de una pantalla, cambia aquí su esqueleto.
 */

// ---------- Piezas ----------

/** La tarjeta violeta de saldo (Inicio, Billetera, Sector, Estadísticas). */
function TarjetaVioleta({ children }: { children: ReactNode }) {
  const styles = useEstilos(crearEstilos);
  return <View style={styles.tarjetaVioleta}>{children}</View>;
}

/** Fila con un icono redondo, dos líneas de texto y un monto (cuentas, sectores). */
function FilaConIcono({ icono = 40 }: { icono?: number }) {
  const styles = useEstilos(crearEstilos);
  return (
    <View style={styles.filaIcono}>
      <Skeleton width={icono} height={icono} radio={radius.pill} />
      <View style={styles.info}>
        <Skeleton width="55%" height={16} />
        <Skeleton width="35%" height={12} />
      </View>
      <Skeleton width={72} height={16} />
    </View>
  );
}

/** Fila de un movimiento (gasto, ingreso, salida de ahorro): texto a la izquierda, monto y etiqueta a la derecha. */
function FilaMovimiento() {
  const styles = useEstilos(crearEstilos);
  return (
    <View style={styles.filaMovimiento}>
      <View style={styles.info}>
        <Skeleton width="60%" height={16} />
        <Skeleton width="38%" height={12} />
      </View>
      <View style={styles.derecha}>
        <Skeleton width={76} height={16} />
        <Skeleton width={56} height={18} radio={radius.pill} />
      </View>
    </View>
  );
}

function Lista({ filas, fila }: { filas: number; fila: () => ReactNode }) {
  const styles = useEstilos(crearEstilos);
  return (
    <Card style={styles.lista}>
      {Array.from({ length: filas }, (_, i) => (
        <Fragment key={i}>
          {i > 0 ? <Divider /> : null}
          {fila()}
        </Fragment>
      ))}
    </Card>
  );
}

// ---------- Pantallas ----------

/** Inicio: tarjeta de saldo, "Disponible por sector" y botones de secciones. */
export function EsqueletoInicio() {
  const styles = useEstilos(crearEstilos);
  return (
    <SkeletonGroup>
      <TarjetaVioleta>
        <Skeleton width={120} height={14} sobreColor />
        <Skeleton width={210} height={40} sobreColor style={styles.total} />
        <Skeleton width={190} height={12} sobreColor />
        <View style={styles.formas}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width="auto" height={58} radio={radius.md} sobreColor style={styles.unTercio} />
          ))}
        </View>
      </TarjetaVioleta>

      <SectionTitle title="Disponible por sector" />
      <Lista filas={4} fila={() => <FilaConIcono />} />

      <SectionTitle title="Secciones" />
      <View style={styles.rejilla}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.baldosa}>
            <Skeleton width={48} height={48} radio={radius.pill} />
            <Skeleton width="55%" height={16} />
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
}

/** Pantalla de un sector: tarjeta de saldo, botón y lista de movimientos. */
export function EsqueletoSector() {
  const styles = useEstilos(crearEstilos);
  return (
    <SkeletonGroup>
      <TarjetaVioleta>
        <Skeleton width={150} height={14} sobreColor />
        <Skeleton width={210} height={40} sobreColor style={styles.total} />
        <Skeleton width={230} height={12} sobreColor />
        <Skeleton height={62} radio={radius.md} sobreColor style={styles.barraFormas} />
      </TarjetaVioleta>

      <Skeleton height={56} radio={radius.md} />

      <Skeleton width={150} height={18} />
      <Lista filas={4} fila={() => <FilaMovimiento />} />
    </SkeletonGroup>
  );
}

/** Estadísticas (debajo del selector de período): resumen, dona y evolución. */
export function EsqueletoEstadisticas() {
  const styles = useEstilos(crearEstilos);
  return (
    <SkeletonGroup>
      <TarjetaVioleta>
        <Skeleton width={130} height={14} sobreColor />
        <Skeleton width={190} height={36} sobreColor style={styles.total} />
        <View style={styles.formas}>
          {[0, 1].map((i) => (
            <Skeleton key={i} width="auto" height={58} radio={radius.md} sobreColor style={styles.mitad} />
          ))}
        </View>
        <Skeleton height={8} radio={radius.pill} sobreColor style={styles.barraFormas} />
      </TarjetaVioleta>

      <Card style={styles.tarjetaGrafico}>
        <Skeleton width={160} height={18} />
        <Skeleton width={176} height={176} radio={radius.pill} style={styles.centrado} />
        <View style={styles.leyenda}>
          {[0, 1, 2].map((i) => (
            <FilaConIcono key={i} icono={36} />
          ))}
        </View>
      </Card>

      <Card style={styles.tarjetaGrafico}>
        <Skeleton width={140} height={18} />
        <Skeleton height={140} radio={radius.md} />
      </Card>
    </SkeletonGroup>
  );
}

/** Billetera: total, cuentas, sectores y la tarjeta de la pareja. */
export function EsqueletoBilletera() {
  const styles = useEstilos(crearEstilos);
  return (
    <SkeletonGroup>
      <TarjetaVioleta>
        <Skeleton width={110} height={14} sobreColor />
        <Skeleton width={210} height={40} sobreColor style={styles.total} />
        <Skeleton width={150} height={12} sobreColor />
        <Skeleton height={50} radio={radius.md} sobreColor style={styles.barraFormas} />
      </TarjetaVioleta>

      <SectionTitle title="Mis cuentas" />
      <Lista filas={3} fila={() => <FilaConIcono icono={44} />} />

      <SectionTitle title="Sectores" />
      <Lista filas={4} fila={() => <FilaConIcono icono={44} />} />

      <SectionTitle title="Pareja" />
      <Card style={styles.tarjetaPareja}>
        <Skeleton width="45%" height={18} />
        <Skeleton width="80%" height={14} />
        <Skeleton height={56} radio={radius.md} />
      </Card>
    </SkeletonGroup>
  );
}

/** Detalle de un movimiento: monto grande, datos y botón. */
export function EsqueletoDetalle() {
  const styles = useEstilos(crearEstilos);
  return (
    <SkeletonGroup>
      <Card style={styles.heroDetalle}>
        <Skeleton width={190} height={40} />
        <Skeleton width={92} height={24} radio={radius.pill} />
      </Card>

      <Card style={styles.datos}>
        {[0, 1, 2, 3].map((i) => (
          <Fragment key={i}>
            {i > 0 ? <Divider /> : null}
            <View style={styles.filaDato}>
              <Skeleton width={96} height={14} />
              <Skeleton width={140} height={14} />
            </View>
          </Fragment>
        ))}
      </Card>

      <Skeleton height={56} radio={radius.md} />
    </SkeletonGroup>
  );
}

/** Notificaciones: avatar, frase, detalle, hora y monto. */
export function EsqueletoNotificaciones() {
  const styles = useEstilos(crearEstilos);
  return (
    <SkeletonGroup>
      <Card style={styles.notificaciones}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Fragment key={i}>
            {i > 0 ? <Divider /> : null}
            <View style={styles.filaNotificacion}>
              <Skeleton width={40} height={40} radio={radius.pill} />
              <View style={styles.info}>
                <Skeleton width="72%" height={16} />
                <Skeleton width="52%" height={14} />
                <Skeleton width="26%" height={12} />
              </View>
              <Skeleton width={64} height={16} />
            </View>
          </Fragment>
        ))}
      </Card>
    </SkeletonGroup>
  );
}

/** Historial: filtros (tipo y mes) y la lista de movimientos. */
export function EsqueletoHistorial() {
  const styles = useEstilos(crearEstilos);
  return (
    <SkeletonGroup>
      <View style={styles.filtros}>
        <Skeleton height={54} radio={radius.pill} />
        <Skeleton height={44} radio={radius.pill} />
      </View>
      <Card style={styles.notificaciones}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Fragment key={i}>
            {i > 0 ? <Divider /> : null}
            <View style={styles.filaNotificacion}>
              <Skeleton width={40} height={40} radio={radius.pill} />
              <View style={styles.info}>
                <Skeleton width="72%" height={16} />
                <Skeleton width="52%" height={14} />
                <Skeleton width="26%" height={12} />
              </View>
              <Skeleton width={64} height={16} />
            </View>
          </Fragment>
        ))}
      </Card>
    </SkeletonGroup>
  );
}

const crearEstilos = ({ colors, shadows }: Tema) => StyleSheet.create({
  tarjetaVioleta: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.xs,
    ...shadows.card,
  },
  total: {
    marginVertical: spacing.xs,
  },
  formas: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  unTercio: {
    flex: 1,
  },
  mitad: {
    flex: 1,
  },
  barraFormas: {
    marginTop: spacing.md,
  },
  lista: {
    paddingVertical: 4,
    paddingHorizontal: spacing.lg,
  },
  filaIcono: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  filaMovimiento: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  derecha: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  rejilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  baldosa: {
    flexGrow: 1,
    flexBasis: '47%',
    minHeight: 112,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    justifyContent: 'space-between',
    ...shadows.card,
  },
  tarjetaGrafico: {
    gap: spacing.lg,
  },
  centrado: {
    alignSelf: 'center',
  },
  leyenda: {
    gap: 0,
  },
  tarjetaPareja: {
    gap: spacing.md,
  },
  heroDetalle: {
    alignItems: 'center',
    gap: spacing.md,
  },
  datos: {
    paddingVertical: spacing.sm,
  },
  filaDato: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  filtros: {
    gap: spacing.md,
  },
  notificaciones: {
    padding: 0,
    overflow: 'hidden',
  },
  filaNotificacion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});