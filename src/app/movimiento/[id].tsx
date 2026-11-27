import { Fragment, useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Divider } from '../../components/common/Divider';
import { EmptyState } from '../../components/common/EmptyState';
import { EsqueletoDetalle } from '../../components/esqueletos/Esqueletos';
import { FormaBadge } from '../../components/common/FormaBadge';
import { Screen } from '../../components/common/Screen';
import { SectionTitle } from '../../components/common/SectionTitle';
import { getDetalleMovimiento, type DetalleMovimiento } from '../../db/queries/detalleMovimiento';
import { useEsqueleto } from '../../hooks/useEsqueleto';
import { useSesionStore } from '../../store/useSesionStore';
import { useSyncStore } from '../../store/useSyncStore';
import { fontSizes, fonts, spacing } from '../../theme';
import { useEstilos, useTema } from '../../theme/useTema';
import type { Tema } from '../../theme/temas';
import { mensajeError } from '../../utils/errors';
import { monedaDeForma, origenLabel } from '../../utils/etiquetas';
import { formatFechaHora } from '../../utils/fechas';
import { formatMonto } from '../../utils/formatters';
import { autorDe, esIngreso, esRetiroAhorro } from '../../utils/notificaciones';

function titulo(tipo: string): string {
  if (tipo === 'ingreso') return 'Ingreso';
  if (tipo === 'ahorro') return 'Retiro de ahorro';
  return 'Gasto';
}

function FilaDetalle({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const styles = useEstilos(crearEstilos);
  return (
    <View style={styles.fila}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <Text style={styles.valor}>{valor}</Text>
    </View>
  );
}

/** Detalle de un movimiento: monto, quién lo registró, cuándo, dónde y (si es ingreso) cómo se repartió. */
export default function MovimientoScreen() {
  const styles = useEstilos(crearEstilos);
  const { colors } = useTema();
  const db = useSQLiteContext();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const yoId = useSesionStore((s) => s.usuario?.id ?? null);
  const miembros = useSesionStore((s) => s.miembros);
  const datosVersion = useSyncStore((s) => s.datosVersion);

  const [detalle, setDetalle] = useState<DetalleMovimiento | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const carga = useEsqueleto(cargando);

  // Se vuelve a leer al volver de editar (el movimiento pudo cambiar o eliminarse) y cuando llegan cambios de la pareja.
  useFocusEffect(
    useCallback(() => {
      let activo = true;
      (async () => {
        try {
          const d = await getDetalleMovimiento(db, String(id));
          if (!activo) return;
          setDetalle(d);
          setError(null);
        } catch (e) {
          if (activo) setError(mensajeError(e));
        } finally {
          if (activo) setCargando(false);
        }
      })();
      return () => {
        activo = false;
      };
    }, [db, id, datosVersion]),
  );

  const volver = useCallback(() => router.back(), [router]);

  if (cargando) {
    return (
      <Screen title="Detalle" onBack={volver}>
        {carga === 'esqueleto' ? <EsqueletoDetalle /> : null}
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen title="Detalle" onBack={volver}>
        <Card>
          <Text style={styles.error}>No se pudieron cargar los datos: {error}</Text>
        </Card>
      </Screen>
    );
  }

  if (!detalle) {
    return (
      <Screen title="Detalle" onBack={volver}>
        <EmptyState
          icon="alert-circle-outline"
          title="Este movimiento ya no existe"
          message="Se eliminó, aquí o desde el teléfono de tu pareja."
          actionLabel="Volver"
          onAction={volver}
        />
      </Screen>
    );
  }

  const { movimiento: m, sector_nombre: sector, repartos } = detalle;
  const moneda = monedaDeForma(m.forma);
  const ingreso = esIngreso(m);
  const autor = autorDe(m.registrado_por, yoId, miembros);
  const editado = new Date(m.updated_at).getTime() - new Date(m.created_at).getTime() > 60_000;

  const editar = () =>
    ingreso
      ? router.push({ pathname: '/editar-ingreso', params: { movimientoId: m.id } })
      : router.push({ pathname: '/nuevo-gasto', params: { movimientoId: m.id } });

  return (
    <Screen title={titulo(m.tipo)} subtitle={formatFechaHora(m.fecha)} onBack={volver}>
      <Card style={styles.hero}>
        <Text style={[styles.monto, { color: ingreso ? colors.positive : colors.negative }]}>
          {ingreso ? '+' : '-'}
          {formatMonto(m.monto, moneda)}
        </Text>
        <FormaBadge forma={m.forma} />
      </Card>

      <Card style={styles.datos}>
        <FilaDetalle
          etiqueta="Registrado por"
          valor={autor.nombre ?? 'No se sabe (es de antes de conectar a tu pareja)'}
        />
        <Divider />
        {ingreso ? (
          <FilaDetalle etiqueta="Origen" valor={origenLabel(m.origen)} />
        ) : (
          <>
            <FilaDetalle etiqueta="Sector" valor={sector} />
            <Divider />
            <FilaDetalle
              etiqueta={esRetiroAhorro(m) ? 'Motivo' : 'Concepto'}
              valor={(esRetiroAhorro(m) ? m.motivo_ahorro : m.concepto) ?? '—'}
            />
          </>
        )}
        <Divider />
        <FilaDetalle etiqueta="Fecha y hora" valor={formatFechaHora(m.fecha)} />
        {editado ? (
          <>
            <Divider />
            <FilaDetalle etiqueta="Última edición" valor={formatFechaHora(m.updated_at)} />
          </>
        ) : null}
      </Card>

      {ingreso && repartos.length > 0 ? (
        <>
          <SectionTitle title="Reparto" />
          <Card style={styles.datos}>
            {repartos.map((r, i) => (
              <Fragment key={r.sector_id}>
                {i > 0 ? <Divider /> : null}
                <FilaDetalle etiqueta={r.sector_nombre} valor={formatMonto(r.monto, moneda)} />
              </Fragment>
            ))}
          </Card>
        </>
      ) : null}

      <Button title="Editar o eliminar" icon="create" onPress={editar} />
    </Screen>
  );
}

const crearEstilos = ({ colors }: Tema) => StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.md,
  },
  monto: {
    fontFamily: fonts.bold,
    fontSize: 34,
  },
  datos: {
    paddingVertical: spacing.sm,
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  etiqueta: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  valor: {
    flex: 1,
    textAlign: 'right',
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.negative,
  },
});