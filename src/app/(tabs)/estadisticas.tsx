import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { Screen } from '../../components/common/Screen';
import { DesgloseCard, type FilaDesglose } from '../../components/estadisticas/DesgloseCard';
import { GastoPorDiaChart } from '../../components/estadisticas/GastoPorDiaChart';
import { ResumenGastoCard } from '../../components/estadisticas/ResumenGastoCard';
import { SelectorPeriodo } from '../../components/estadisticas/SelectorPeriodo';
import { cargarEstadisticas, type DatosEstadisticas } from '../../db/queries/estadisticas';
import { colors, fontSizes, fonts, formaColors } from '../../theme';
import { colorDeSector, formaIconos, iconoDeSector } from '../../theme/iconos';
import { FORMA_LABEL } from '../../utils/constants';
import { mensajeError } from '../../utils/errors';
import type { Periodo } from '../../utils/fechas';

const NOTA_USD = 'Las barras comparan solo los gastos en pesos; el USD va aparte.';

export default function EstadisticasScreen() {
  const db = useSQLiteContext();

  const [periodo, setPeriodo] = useState<Periodo>('mes');
  /** 0 = período actual, -1 = el anterior, etc. Se guarda así (y no como fecha) para que "hoy" siempre sea hoy. */
  const [desplazamiento, setDesplazamiento] = useState(0);

  const [datos, setDatos] = useState<DatosEstadisticas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Se recalcula al entrar a la pestaña y cada vez que cambia el período elegido.
  useFocusEffect(
    useCallback(() => {
      let activo = true;
      (async () => {
        try {
          const resultado = await cargarEstadisticas(db, periodo, desplazamiento);
          if (!activo) return;
          setDatos(resultado);
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
    }, [db, periodo, desplazamiento]),
  );

  function cambiarPeriodo(nuevo: Periodo) {
    if (nuevo === periodo) return;
    setPeriodo(nuevo);
    setDesplazamiento(0);
  }

  const stats = datos?.stats ?? null;

  const filasForma = useMemo<FilaDesglose[]>(() => {
    if (!stats) return [];
    return [
      {
        id: 'efectivo',
        nombre: FORMA_LABEL.efectivo,
        color: formaColors.efectivo,
        icono: formaIconos.efectivo,
        cup: stats.porForma.efectivo,
        usd: 0,
        porcentaje: stats.porcentajeForma.efectivo,
      },
      {
        id: 'transferencia',
        nombre: FORMA_LABEL.transferencia,
        color: formaColors.transferencia,
        icono: formaIconos.transferencia,
        cup: stats.porForma.transferencia,
        usd: 0,
        porcentaje: stats.porcentajeForma.transferencia,
      },
      {
        id: 'usd',
        nombre: FORMA_LABEL.usd,
        color: formaColors.usd,
        icono: formaIconos.usd,
        cup: 0,
        usd: stats.porForma.usd,
        porcentaje: 0,
      },
    ];
  }, [stats]);

  const filasSector = useMemo<FilaDesglose[]>(
    () =>
      (stats?.porSector ?? []).map((s) => ({
        id: s.sector_id,
        nombre: s.nombre,
        color: colorDeSector(s),
        icono: iconoDeSector(s),
        cup: s.cup,
        usd: s.usd,
        porcentaje: s.porcentaje,
      })),
    [stats],
  );

  return (
    <Screen title="Estadísticas" subtitle="Cuánto gastas y en qué">
      <SelectorPeriodo
        periodo={periodo}
        onPeriodoChange={cambiarPeriodo}
        etiqueta={datos?.rango.etiqueta ?? ''}
        onAnterior={() => setDesplazamiento((d) => d - 1)}
        onSiguiente={() => setDesplazamiento((d) => Math.min(0, d + 1))}
        puedeSiguiente={desplazamiento < 0}
      />

      {error ? (
        <Card>
          <Text style={styles.error}>No se pudieron cargar los datos: {error}</Text>
        </Card>
      ) : cargando || !stats ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : stats.cantidad === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="Sin gastos en este período"
          message="Cuando registres gastos en este período, aquí verás el resumen y los gráficos."
        />
      ) : (
        <>
          <ResumenGastoCard totalCup={stats.totalCup} totalUsd={stats.totalUsd} cantidad={stats.cantidad} />

          {periodo !== 'dia' ? <GastoPorDiaChart periodo={periodo} dias={stats.porDia} /> : null}

          <DesgloseCard
            titulo="Por forma de dinero"
            filas={filasForma}
            nota={stats.totalUsd > 0 ? NOTA_USD : undefined}
          />

          <DesgloseCard
            titulo="Por sector"
            filas={filasSector}
            nota={stats.totalUsd > 0 ? NOTA_USD : undefined}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 40,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.negative,
  },
});