import { Fragment, useCallback, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Card } from '../../components/common/Card';
import { Divider } from '../../components/common/Divider';
import { Screen } from '../../components/common/Screen';
import { SectionTitle } from '../../components/common/SectionTitle';
import { ResumenInicioCard } from '../../components/inicio/ResumenInicioCard';
import { SectorSaldoRow } from '../../components/inicio/SectorSaldoRow';
import { SectorTile } from '../../components/inicio/SectorTile';
import { useCuentasStore } from '../../store/useCuentasStore';
import { useSaldosSectoresStore } from '../../store/useSaldosSectoresStore';
import { useSectoresStore } from '../../store/useSectoresStore';
import { colors, fontSizes, fonts, spacing } from '../../theme';
import { resumenSaldos } from '../../utils/saldos';

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
  const saldosError = useSaldosSectoresStore((s) => s.error);
  const cargarSaldos = useSaldosSectoresStore((s) => s.cargar);

  // Cada vez que se vuelve a Inicio (por ejemplo tras guardar un gasto) se actualiza todo.
  useFocusEffect(
    useCallback(() => {
      void cargarCuentas(db);
      void cargarSectores(db);
      void cargarSaldos(db);
    }, [db, cargarCuentas, cargarSectores, cargarSaldos]),
  );

  const resumen = useMemo(() => resumenSaldos(cuentas), [cuentas]);
  const saldoPorSector = useMemo(() => new Map(saldos.map((s) => [s.sector_id, s])), [saldos]);

  const error = cuentasError ?? sectoresError ?? saldosError;
  const cargando = cuentasCargando || sectoresCargando || saldosCargando;

  return (
    <Screen title="Inicio" subtitle="Cómo va el dinero de los dos">
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

          <SectionTitle title="Disponible por sector" />
          <Card style={styles.listCard}>
            {sectores.map((sector, i) => (
              <Fragment key={sector.id}>
                {i > 0 ? <Divider /> : null}
                <SectorSaldoRow sector={sector} saldo={saldoPorSector.get(sector.id)} />
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