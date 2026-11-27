import { Fragment, useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Card } from '../../components/common/Card';
import { Divider } from '../../components/common/Divider';
import { EmptyState } from '../../components/common/EmptyState';
import { Screen } from '../../components/common/Screen';
import { SectionTitle } from '../../components/common/SectionTitle';
import { CampanaNotificaciones } from '../../components/inicio/CampanaNotificaciones';
import { CierrePendienteCard } from '../../components/inicio/CierrePendienteCard';
import { ResumenInicioCard } from '../../components/inicio/ResumenInicioCard';
import { SectorSaldoRow } from '../../components/inicio/SectorSaldoRow';
import { SectorTile } from '../../components/inicio/SectorTile';
import { BotonTema } from '../../components/tema/BotonTema';
import { EsqueletoInicio } from '../../components/esqueletos/Esqueletos';
import { useEsqueleto } from '../../hooks/useEsqueleto';
import { crearLectorInicio } from '../../store/lectorInicio';
import { useCierreStore } from '../../store/useCierreStore';
import { useCuentasStore } from '../../store/useCuentasStore';
import { useSaldosSectoresStore } from '../../store/useSaldosSectoresStore';
import { useSectoresStore } from '../../store/useSectoresStore';
import { syncStore, useSyncStore } from '../../store/useSyncStore';
import { fontSizes, fonts, spacing } from '../../theme';
import { useEstilos } from '../../theme/useTema';
import type { Tema } from '../../theme/temas';
import { resumenSaldos } from '../../utils/saldos';

/** Cuánto se espera, como máximo, a que termine la sincronización al tirar de la pantalla. */
const ESPERA_MAXIMA_MS = 20_000;

export default function InicioScreen() {
  const styles = useEstilos(crearEstilos);
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

  // El cierre del mes que acaba de terminar (si todavía no se vio en este teléfono).
  const cierrePendiente = useCierreStore((s) => s.pendiente);
  const cierreCargado = useCierreStore((s) => s.cargado);
  const cargarCierre = useCierreStore((s) => s.cargar);
  const marcarCierreVisto = useCierreStore((s) => s.marcarVisto);

  // Sube cuando llegaron cambios de la pareja: se vuelve a leer la base local.
  const datosVersion = useSyncStore((s) => s.datosVersion);

  // Al volver a Inicio se leen los datos, salvo que nada haya cambiado desde la última lectura (ver `lectorInicio`).
  // Lo que se guarda en este teléfono ya actualiza los saldos al instante; lo que llega de la pareja sube `datosVersion`.
  const [lector] = useState(crearLectorInicio);
  useFocusEffect(
    useCallback(() => {
      void lector.leer(db, datosVersion);
    }, [db, datosVersion, lector]),
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
    await Promise.all([cargarCuentas(db), cargarSectores(db), cargarSaldos(db), cargarCierre(db)]);
    if (aviso) Alert.alert('No se pudo sincronizar', aviso);
  }, [db, cargarCuentas, cargarSectores, cargarSaldos, cargarCierre]);

  const resumen = useMemo(() => resumenSaldos(cuentas), [cuentas]);
  const sinDinero = resumen.efectivo === 0 && resumen.transferencia === 0 && resumen.usd === 0;
  const saldoPorSector = useMemo(() => new Map(saldos.map((s) => [s.sector_id, s])), [saldos]);

  const error = cuentasError ?? sectoresError ?? saldosError;
  // El aviso del cierre se lee con lo demás (solo la primera vez) para que Inicio no cambie de altura al aparecer.
  const cargando = cuentasCargando || sectoresCargando || saldosCargando || !cierreCargado;
  const carga = useEsqueleto(cargando);

  return (
    <Screen
      title="Inicio"
      subtitle="Cómo va el dinero de los dos"
      derecha={
        <View style={styles.acciones}>
          <BotonTema />
          <CampanaNotificaciones />
        </View>
      }
      onRefresh={refrescar}
    >
      {error ? (
        <Card>
          <Text style={styles.error}>No se pudieron cargar los datos: {error}</Text>
        </Card>
      ) : carga === 'esqueleto' ? (
        <EsqueletoInicio />
      ) : cargando ? null : (
        <>
          {cierrePendiente ? (
            <CierrePendienteCard
              etiqueta={cierrePendiente.etiqueta}
              onAbrir={() => router.push({ pathname: '/cierre-mes', params: { mes: cierrePendiente.clave } })}
              onDescartar={() => void marcarCierreVisto(db, cierrePendiente.clave)}
            />
          ) : null}

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

const crearEstilos = ({ colors }: Tema) => StyleSheet.create({
  acciones: {
    flexDirection: 'row',
    gap: spacing.sm,
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