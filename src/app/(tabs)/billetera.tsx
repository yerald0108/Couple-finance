import { Fragment, useCallback, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { CuentaItem } from '../../components/billetera/CuentaItem';
import { ResumenSaldosCard } from '../../components/billetera/ResumenSaldosCard';
import { SectorItem } from '../../components/billetera/SectorItem';
import { Card } from '../../components/common/Card';
import { Divider } from '../../components/common/Divider';
import { Screen } from '../../components/common/Screen';
import { SectionTitle } from '../../components/common/SectionTitle';
import { useCuentasStore } from '../../store/useCuentasStore';
import { useSectoresStore } from '../../store/useSectoresStore';
import { colors, fontSizes, fonts } from '../../theme';
import { resumenSaldos } from '../../utils/saldos';

export default function BilleteraScreen() {
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

  // Cada vez que se entra a esta pantalla se leen los datos de la base local.
  useFocusEffect(
    useCallback(() => {
      void cargarCuentas(db);
      void cargarSectores(db);
    }, [db, cargarCuentas, cargarSectores]),
  );

  const resumen = useMemo(() => resumenSaldos(cuentas), [cuentas]);
  const error = cuentasError ?? sectoresError;

  return (
    <Screen title="Billetera" subtitle="Tus cuentas y sectores">
      {error ? (
        <Card>
          <Text style={styles.error}>No se pudieron cargar los datos: {error}</Text>
        </Card>
      ) : cuentasCargando || sectoresCargando ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <>
          <ResumenSaldosCard totalCup={resumen.totalCup} usd={resumen.usd} />

          <SectionTitle title="Mis cuentas" />
          <Card style={styles.listCard}>
            {cuentas.map((cuenta, i) => (
              <Fragment key={cuenta.id}>
                {i > 0 ? <Divider /> : null}
                <CuentaItem cuenta={cuenta} />
              </Fragment>
            ))}
          </Card>

          <SectionTitle
            title="Sectores"
            actionLabel="Nuevo sector"
            onActionPress={() => router.push('/nuevo-sector')}
          />
          <Card style={styles.listCard}>
            {sectores.map((sector, i) => (
              <Fragment key={sector.id}>
                {i > 0 ? <Divider /> : null}
                <SectorItem sector={sector} />
              </Fragment>
            ))}
          </Card>
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
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.negative,
  },
});