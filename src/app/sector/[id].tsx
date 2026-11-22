import { Fragment, useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Divider } from '../../components/common/Divider';
import { EmptyState } from '../../components/common/EmptyState';
import { Screen } from '../../components/common/Screen';
import { SectionTitle } from '../../components/common/SectionTitle';
import { EsqueletoSector } from '../../components/esqueletos/Esqueletos';
import { AhorroItem } from '../../components/sector/AhorroItem';
import { GastoItem } from '../../components/sector/GastoItem';
import { IngresoItem } from '../../components/sector/IngresoItem';
import { SaldoSectorCard } from '../../components/sector/SaldoSectorCard';
import { TotalesFormaCard } from '../../components/sector/TotalesFormaCard';
import { cargarVistaSector, type VistaSector } from '../../db/queries/vistaSector';
import { useEsqueleto } from '../../hooks/useEsqueleto';
import { useSesionStore } from '../../store/useSesionStore';
import { useSyncStore } from '../../store/useSyncStore';
import { colors, fontSizes, fonts, spacing } from '../../theme';
import { mensajeError } from '../../utils/errors';
import { autorDe } from '../../utils/notificaciones';
import { totalesPorForma } from '../../utils/totales';

/** Pantalla de un sector: lista del mes (o historial, en Ahorro) y botón para añadir. */
export default function SectorScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [vista, setVista] = useState<VistaSector | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const carga = useEsqueleto(cargando);

  // Sube cuando llegaron cambios de la pareja: se vuelve a leer el sector.
  const datosVersion = useSyncStore((s) => s.datosVersion);
  // Para la etiqueta "registrado por" de cada movimiento.
  const yoId = useSesionStore((s) => s.usuario?.id ?? null);
  const miembros = useSesionStore((s) => s.miembros);

  // Se recarga cada vez que se vuelve aquí (por ejemplo, tras guardar un gasto).
  useFocusEffect(
    useCallback(() => {
      let activo = true;
      (async () => {
        try {
          const datos = await cargarVistaSector(db, String(id));
          if (!activo) return;
          setVista(datos);
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

  const totalesIngresos = useMemo(
    () =>
      vista?.clase === 'ingresos'
        ? totalesPorForma(vista.ingresos.map((i) => ({ forma: i.movimiento.forma, monto: i.movimiento.monto })))
        : null,
    [vista],
  );
  const totalesGastos = useMemo(
    () =>
      vista?.clase === 'gastos'
        ? totalesPorForma(vista.gastos.map((g) => ({ forma: g.forma, monto: g.monto })))
        : null,
    [vista],
  );

  if (cargando) {
    return (
      <Screen title="Sector" onBack={volver}>
        {carga === 'esqueleto' ? <EsqueletoSector /> : null}
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen title="Sector" onBack={volver}>
        <Card>
          <Text style={styles.error}>No se pudieron cargar los datos: {error}</Text>
        </Card>
      </Screen>
    );
  }

  if (!vista) {
    return (
      <Screen title="Sector" onBack={volver}>
        <EmptyState
          icon="alert-circle-outline"
          title="Sector no encontrado"
          message="Este sector ya no existe. Vuelve a Inicio y elige otro."
        />
      </Screen>
    );
  }

  const { sector } = vista;
  const irANuevoGasto = () => router.push({ pathname: '/nuevo-gasto', params: { sectorId: sector.id } });
  const editarGasto = (movimientoId: string) =>
    router.push({ pathname: '/nuevo-gasto', params: { movimientoId } });
  const editarIngreso = (movimientoId: string) =>
    router.push({ pathname: '/editar-ingreso', params: { movimientoId } });

  // ---------- Ingresos ----------
  if (vista.clase === 'ingresos') {
    return (
      <Screen title={sector.nombre} subtitle={`Ingresos de ${vista.mes}`} onBack={volver}>
        {totalesIngresos ? <TotalesFormaCard titulo="Total del mes por forma" totales={totalesIngresos} /> : null}

        <SectionTitle title="Ingresos del mes" />
        {vista.ingresos.length === 0 ? (
          <EmptyState
            icon="trending-up-outline"
            title="Aún no hay ingresos este mes"
            message="Registra uno desde la pestaña Movimientos y aparecerá aquí."
            actionLabel="Registrar ingreso"
            onAction={() => router.navigate('/movimientos')}
          />
        ) : (
          <>
            <Card style={styles.listCard}>
              {vista.ingresos.map((ingreso, i) => (
                <Fragment key={ingreso.movimiento.id}>
                  {i > 0 ? <Divider /> : null}
                  <IngresoItem
                    ingreso={ingreso}
                    autor={autorDe(ingreso.movimiento.registrado_por, yoId, miembros)}
                    onPress={() => editarIngreso(ingreso.movimiento.id)}
                  />
                </Fragment>
              ))}
            </Card>
            <Text style={styles.nota}>Toca un ingreso para editarlo o eliminarlo.</Text>
          </>
        )}
      </Screen>
    );
  }

  // ---------- Ahorro ----------
  if (vista.clase === 'ahorro') {
    return (
      <Screen title={sector.nombre} subtitle="Entradas y salidas de tu cuenta de ahorro" onBack={volver}>
        <SaldoSectorCard cup={vista.saldo.cup} porForma={vista.saldoPorForma} />
        <Button title="Retirar de ahorro" icon="remove-circle-outline" onPress={irANuevoGasto} />

        <SectionTitle title="Historial" />
        {vista.historial.length === 0 ? (
          <EmptyState
            icon="wallet-outline"
            title="Sin movimientos en ahorro"
            message="Cuando repartas un ingreso hacia Ahorro, o retires dinero, lo verás aquí."
          />
        ) : (
          <>
            <Card style={styles.listCard}>
              {vista.historial.map((item, i) => (
                <Fragment key={`${item.clase}-${item.id}`}>
                  {i > 0 ? <Divider /> : null}
                  <AhorroItem
                    item={item}
                    autor={autorDe(item.registrado_por, yoId, miembros)}
                    onPress={item.clase === 'salida' ? () => editarGasto(item.id) : undefined}
                  />
                </Fragment>
              ))}
            </Card>
            <Text style={styles.nota}>
              Toca una salida para editarla o eliminarla. Las entradas se editan desde el ingreso
              que las generó (sector Ingresos).
            </Text>
          </>
        )}
        {vista.hayMas ? (
          <Text style={styles.nota}>Se muestran los últimos {vista.historial.length} movimientos.</Text>
        ) : null}
      </Screen>
    );
  }

  // ---------- Gastos fijos, Gustos y sectores personalizados ----------
  return (
    <Screen title={sector.nombre} subtitle={`Gastos de ${vista.mes}`} onBack={volver}>
      <SaldoSectorCard cup={vista.saldo.cup} porForma={vista.saldoPorForma} />
      <Button title="Añadir gasto" icon="add" onPress={irANuevoGasto} />

      {totalesGastos ? <TotalesFormaCard titulo="Gastado este mes por forma" totales={totalesGastos} /> : null}

      <SectionTitle title="Gastos del mes" />
      {vista.gastos.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="Aún no hay gastos este mes"
          message="Toca «Añadir gasto» para registrar el primero."
        />
      ) : (
        <>
          <Card style={styles.listCard}>
            {vista.gastos.map((gasto, i) => (
              <Fragment key={gasto.id}>
                {i > 0 ? <Divider /> : null}
                <GastoItem gasto={gasto} autor={autorDe(gasto.registrado_por, yoId, miembros)} onPress={() => editarGasto(gasto.id)} />
              </Fragment>
            ))}
          </Card>
          <Text style={styles.nota}>Toca un gasto para editarlo o eliminarlo.</Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  listCard: {
    paddingVertical: 4,
    paddingHorizontal: spacing.lg,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.negative,
  },
  nota: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});