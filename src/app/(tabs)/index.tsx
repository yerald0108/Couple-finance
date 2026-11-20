import { Fragment, useCallback, useMemo } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Card } from '../../components/common/Card';
import { Divider } from '../../components/common/Divider';
import { EmptyState } from '../../components/common/EmptyState';
import { Screen } from '../../components/common/Screen';
import { SectionTitle } from '../../components/common/SectionTitle';
import { CampanaNotificaciones } from '../../components/inicio/CampanaNotificaciones';
import { ResumenInicioCard } from '../../components/inicio/ResumenInicioCard';
import { SectorSaldoRow } from '../../components/inicio/SectorSaldoRow';
import { SectorTile } from '../../components/inicio/SectorTile';
import { useCuentasStore } from '../../store/useCuentasStore';
import { useSaldosSectoresStore } from '../../store/useSaldosSectoresStore';
import { useSectoresStore } from '../../store/useSectoresStore';
import { syncStore, useSyncStore } from '../../store/useSyncStore';
import { colors, fontSizes, fonts, spacing } from '../../theme';
import { resumenSaldos } from '../../utils/saldos';

/** Cuánto se espera, como máximo, a que termine la sincronización al tirar de la pantalla. */
const ESPERA_MAXIMA_MS = 20_000;

export default function InicioScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  const cuentas = useCuentasStore((s) => s.cuentas);
  const cuentasCargando = useCuentasStore((s) => s.cargando);
  const cuentasError = useCuentasStore((s) => s.error);
  const cargarCuentas = useCuentasStore((s) => s.cargar);

  const sectores = useSectoresStore((s) => s.sectores);
  const sectoresCargando = useSectoresStore((s) => s.cargando);
  const sectoresError = useSectoresStore((s) => s.error);
  const cargarSectores = useSectoresStore((s) => s.cargar);

  const saldos = useSaldosSectoresStore((s) => s.saldos);
  const saldosCargando = useSaldosSectoresStore((s) => s.cargando);
  const ingresosMes = useSaldosSectoresStore((s) => s.ingresosMes);
  const saldosError = useSaldosSectoresStore((s) => s.error);
  const cargarSaldos = useSaldosSectoresStore((s) => s.cargar);

  // Sube cuando llegaron cambios de la pareja: se vuelve a leer la base local.
  const datosVersion = useSyncStore((s) => s.datosVersion);

  // Cada vez que se vuelve a Inicio (por ejemplo tras guardar un gasto) se actualiza todo.
  useFocusEffect(
    useCallback(() => {
      void cargarCuentas(db);
      void cargarSectores(db);
      void cargarSaldos(db);
    }, [db, datosVersion, cargarCuentas, cargarSectores, cargarSaldos]),
  );

  // Tirar de la pantalla hacia abajo: sincroniza con tu pareja (si está conectada) y vuelve a leer todo.
  const refrescar = useCallback(async () => {
    let aviso: string | null = null;
    const sync = syncStore.getState();
    if (sync.activo && sync.estado !== 'decidir') {
      // Si no responde en 20 s se deja de esperar (sigue en segundo plano) y se muestra lo guardado en este teléfono.
      await Promise.race([sync.sincronizar(db), new Promise<void>((r) => setTimeout(r, ESPERA_MAXIMA_MS))]);
      const despues = syncStore.getState();
      if (despues.estado === 'sin_conexion') {
        aviso = 'No hay conexión. Se muestran los datos guardados en este teléfono; lo que registres se enviará cuando vuelva internet.';
      } else if (despues.estado === 'error') {
        aviso = despues.error ?? 'Inténtalo de nuevo en un momento.';
      }
    }
    await Promise.all([cargarCuentas(db), cargarSectores(db), cargarSaldos(db)]);
    if (aviso) Alert.alert('No se pudo sincronizar', aviso);
  }, [db, cargarCuentas, cargarSectores, cargarSaldos]);

  const resumen = useMemo(() => resumenSaldos(cuentas), [cuentas]);
  const sinDinero = resumen.efectivo === 0 && resumen.transferencia === 0 && resumen.usd === 0;
  const saldoPorSector = useMemo(() => new Map(saldos.map((s) => [s.sector_id, s])), [saldos]);

  const error = cuentasError ?? sectoresError ?? saldosError;
  const cargando = cuentasCargando || sectoresCargando || saldosCargando;

  return (
    <Screen
      title="Inicio"
      subtitle="Cómo va el dinero de los dos"
      derecha={<CampanaNotificaciones />}
      onRefresh={refrescar}
    >
      {error ? (
        <Card>
          <Text style={styles.error}>No se pudieron cargar los datos: {error}</Text>
        </Card>
      ) : cargando ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <>
          <ResumenInicioCard
            totalCup={resumen.totalCup}
            efectivo={resumen.efectivo}
            transferencia={resumen.transferencia}
            usd={resumen.usd}
          />

          {sinDinero ? (
            <EmptyState
              icon="wallet-outline"
              title="Tus saldos están en cero"
              message="Registra un ingreso y repártelo entre tus sectores para empezar a ver cómo va el dinero."
              actionLabel="Registrar ingreso"
              onAction={() => router.navigate('/movimientos')}
            />
          ) : null}

          <SectionTitle title="Disponible por sector" />
          <Card style={styles.listCard}>
            {sectores.map((sector, i) => (
              <Fragment key={sector.id}>
                {i > 0 ? <Divider /> : null}
                {sector.tipo === 'ingresos' ? (
                  // Ingresos no "tiene saldo": su fila muestra lo que ha entrado este mes.
                  <SectorSaldoRow
                    sector={sector}
                    saldo={{ sector_id: sector.id, ...ingresosMes }}
                    detalle="Entrado este mes"
                  />
                ) : (
                  <SectorSaldoRow sector={sector} saldo={saldoPorSector.get(sector.id)} />
                )}
              </Fragment>
            ))}
          </Card>

          <SectionTitle title="Secciones" />
          <View style={styles.grid}>
            {sectores.map((sector) => (
              <SectorTile
                key={sector.id}
                sector={sector}
                onPress={() => router.push(`/sector/${sector.id}`)}
              />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 40,
  },
  listCard: {
    paddingVertical: 4,
    paddingHorizontal: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.negative,
  },
});