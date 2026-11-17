import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { Screen } from '../../components/common/Screen';
import { SectionTitle } from '../../components/common/SectionTitle';
import { AnalisisCard } from '../../components/estadisticas/AnalisisCard';
import { ComparacionCard } from '../../components/estadisticas/ComparacionCard';
import { DonaCard, type FilaDona } from '../../components/estadisticas/DonaCard';
import { EvolucionChart } from '../../components/estadisticas/EvolucionChart';
import { RankingCard, type FilaRanking } from '../../components/estadisticas/RankingCard';
import { ResumenPeriodoCard } from '../../components/estadisticas/ResumenPeriodoCard';
import { SelectorPeriodo } from '../../components/estadisticas/SelectorPeriodo';
import { UsoSectoresCard } from '../../components/estadisticas/UsoSectoresCard';
import { cargarEstadisticas, type DatosEstadisticas } from '../../db/queries/estadisticas';
import { useSyncStore } from '../../store/useSyncStore';
import { colors, fontSizes, fonts, formaColors } from '../../theme';
import { colorDeSector, formaIconos, iconoDeSector } from '../../theme/iconos';
import { FORMA_LABEL } from '../../utils/constants';
import { mensajeError } from '../../utils/errors';
import { formatFechaHora, type Periodo } from '../../utils/fechas';
import { formatMonto } from '../../utils/formatters';

const NOTA_USD = 'La dona muestra solo los gastos en pesos; el USD va aparte.';

export default function EstadisticasScreen() {
  const db = useSQLiteContext();

  const [periodo, setPeriodo] = useState<Periodo>('mes');
  /** 0 = período actual, -1 = el anterior, etc. Se guarda así (y no como fecha) para que "hoy" siempre sea hoy. */
  const [desplazamiento, setDesplazamiento] = useState(0);

  const [datos, setDatos] = useState<DatosEstadisticas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sube cuando llegaron cambios de la pareja: se recalcula con lo nuevo.
  const datosVersion = useSyncStore((s) => s.datosVersion);

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
    }, [db, periodo, desplazamiento, datosVersion]),
  );

  function cambiarPeriodo(nuevo: Periodo) {
    if (nuevo === periodo) return;
    setPeriodo(nuevo);
    setDesplazamiento(0);
  }

  const stats = datos?.stats ?? null;
  const analisis = datos?.analisis ?? null;

  const filasForma = useMemo<FilaDona[]>(() => {
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

  const filasSector = useMemo<FilaDona[]>(
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

  const filasTopGastos = useMemo<FilaRanking[]>(
    () =>
      (analisis?.detalle.topGastos ?? []).map((g, i) => ({
        id: `${g.fecha}-${i}`,
        titulo: g.texto,
        subtitulo: `${g.sector} · ${formatFechaHora(g.fecha)} · ${FORMA_LABEL[g.forma]}`,
        monto: formatMonto(g.monto),
      })),
    [analisis],
  );

  const filasConceptos = useMemo<FilaRanking[]>(
    () =>
      (analisis?.detalle.conceptos ?? []).map((c) => ({
        id: c.concepto,
        titulo: c.concepto,
        subtitulo: `${c.veces} ${c.veces === 1 ? 'vez' : 'veces'}`,
        monto: formatMonto(c.cup),
      })),
    [analisis],
  );

  const hayGastos = (stats?.cantidad ?? 0) > 0;
  const hayIngresos = (analisis?.resumen.ingresos.cup ?? 0) > 0 || (analisis?.resumen.ingresos.usd ?? 0) > 0;
  const topUsd = analisis?.detalle.topGastoUsd ?? null;

  return (
    <Screen title="Estadísticas" subtitle="Cuánto entra, cuánto gastas y en qué">
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
      ) : cargando || !stats || !analisis || !datos ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : !hayGastos && !hayIngresos ? (
        <EmptyState
          icon="receipt-outline"
          title="Sin movimientos en este período"
          message="Cuando registres ingresos o gastos en este período, aquí verás el resumen, los gráficos y el análisis."
        />
      ) : (
        <>
          <ResumenPeriodoCard resumen={analisis.resumen} cantidad={stats.cantidad} />

          {analisis.comparacion ? (
            <ComparacionCard
              comparacion={analisis.comparacion}
              etiquetaAnterior={datos.comparable.etiqueta}
              parcial={datos.comparable.parcial}
            />
          ) : null}

          {hayGastos ? (
            <>
              <DonaCard
                titulo="Gastos por sector"
                filas={filasSector}
                totalCup={stats.totalCup}
                nota={stats.totalUsd > 0 ? NOTA_USD : undefined}
              />

              <DonaCard
                titulo="Gastos por forma de dinero"
                filas={filasForma}
                totalCup={stats.totalCup}
                nota={stats.totalUsd > 0 ? NOTA_USD : undefined}
              />

              {analisis.evolucion ? <EvolucionChart evolucion={analisis.evolucion} /> : null}

              <SectionTitle title="Análisis detallado" />
              <AnalisisCard analisis={analisis} periodo={periodo} />

              {filasTopGastos.length > 0 ? (
                <RankingCard
                  titulo="Los gastos más grandes (pesos)"
                  filas={filasTopGastos}
                  nota={
                    topUsd
                      ? `El mayor gasto en USD fue ${formatMonto(topUsd.monto, 'USD')} (${topUsd.texto}).`
                      : undefined
                  }
                />
              ) : null}

              {filasConceptos.length > 0 ? (
                <RankingCard
                  titulo="En qué gastas más (pesos)"
                  filas={filasConceptos}
                  nota="Se juntan los conceptos escritos igual (Arroz, arroz). No incluye retiros de ahorro."
                />
              ) : null}
            </>
          ) : (
            <Card>
              <Text style={styles.sinGastos}>No hay gastos en este período.</Text>
            </Card>
          )}

          {analisis.usoSectores.length > 0 ? <UsoSectoresCard filas={analisis.usoSectores} /> : null}
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
  sinGastos: {
    fontFamily: fonts.medium,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
});