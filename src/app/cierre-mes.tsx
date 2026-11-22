import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { NavegadorMes } from '../components/cierre/NavegadorMes';
import { CierreResumenCard } from '../components/cierre/CierreResumenCard';
import { NumerosMesCard } from '../components/cierre/NumerosMesCard';
import { PuntosCard } from '../components/cierre/PuntosCard';
import { SectoresCierreCard } from '../components/cierre/SectoresCierreCard';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { Screen } from '../components/common/Screen';
import { EsqueletoCierre } from '../components/esqueletos/EsqueletoCierre';
import { ComparacionCard } from '../components/estadisticas/ComparacionCard';
import { RankingCard, type FilaRanking } from '../components/estadisticas/RankingCard';
import { cargarCierreMes } from '../db/queries/cierreMes';
import { useEsqueleto } from '../hooks/useEsqueleto';
import { useCierreStore } from '../store/useCierreStore';
import { useSyncStore } from '../store/useSyncStore';
import { colors, fontSizes, fonts } from '../theme';
import {
  claveDeDesplazamiento,
  claveMesAnterior,
  desplazamientoDeClave,
  etiquetaDeClave,
  type CierreMes,
} from '../utils/cierreMes';
import { FORMA_LABEL } from '../utils/constants';
import { mensajeError } from '../utils/errors';
import { formatFechaHora } from '../utils/fechas';
import { formatMonto } from '../utils/formatters';

/**
 * Cierre de mes: el resumen de un mes ya terminado (cuánto entró, cuánto salió, qué sector se pasó), pensado
 * para mirarlo en pareja. Sin parámetro muestra el último mes terminado; `?mes=2026-10` abre ese mes.
 * Las flechas llevan a los meses anteriores. El mes actual no aparece: se cierra cuando termina.
 */
export default function CierreMesScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { mes } = useLocalSearchParams<{ mes?: string }>();

  const [clave, setClave] = useState<string>(() => {
    const ahora = new Date();
    return typeof mes === 'string' && desplazamientoDeClave(mes, ahora) !== null ? mes : claveMesAnterior(ahora);
  });
  const [cierre, setCierre] = useState<CierreMes | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const carga = useEsqueleto(cargando);
  /** Mes del que es el `cierre` que se muestra. */
  const claveCargada = useRef<string | null>(null);

  // Sube cuando llegaron cambios de la pareja: se recalcula con lo nuevo.
  const datosVersion = useSyncStore((s) => s.datosVersion);
  const marcarVisto = useCierreStore((s) => s.marcarVisto);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      // Al cambiar de mes se vuelve a mostrar la carga (si tarda); un cambio de la pareja recalcula en silencio.
      if (claveCargada.current !== clave) setCargando(true);
      (async () => {
        try {
          const resultado = await cargarCierreMes(db, clave);
          if (!activo) return;
          setCierre(resultado);
          claveCargada.current = clave;
          setError(null);
          // Abrir el cierre del último mes terminado lo da por visto (se quita el aviso de Inicio).
          if (resultado && clave === claveMesAnterior(new Date())) await marcarVisto(db, clave);
        } catch (e) {
          if (activo) setError(mensajeError(e));
        } finally {
          if (activo) setCargando(false);
        }
      })();
      return () => {
        activo = false;
      };
    }, [db, clave, datosVersion, marcarVisto]),
  );

  const volver = useCallback(() => router.back(), [router]);

  const ahora = new Date();
  const desplazamiento = desplazamientoDeClave(clave, ahora) ?? -1;
  const irAMes = (d: number) => setClave(claveDeDesplazamiento(d, new Date()));

  const filasTopGastos = useMemo<FilaRanking[]>(
    () =>
      (cierre?.topGastos ?? []).map((g, i) => ({
        id: `${g.fecha}-${i}`,
        titulo: g.texto,
        subtitulo: `${g.sector} · ${formatFechaHora(g.fecha)} · ${FORMA_LABEL[g.forma]}`,
        monto: formatMonto(g.monto),
      })),
    [cierre],
  );

  return (
    <Screen title="Cierre de mes" subtitle="Para mirarlo juntos" onBack={volver}>
      <NavegadorMes
        etiqueta={etiquetaDeClave(clave)}
        onAnterior={() => irAMes(desplazamiento - 1)}
        onSiguiente={() => irAMes(desplazamiento + 1)}
        puedeAnterior={cierre?.hayMesAnterior ?? false}
        puedeSiguiente={desplazamiento < -1}
      />

      {error ? (
        <Card>
          <Text style={styles.error}>No se pudieron cargar los datos: {error}</Text>
        </Card>
      ) : carga === 'esqueleto' ? (
        <EsqueletoCierre />
      ) : !cierre ? null : !cierre.hayMovimientos ? (
        <EmptyState
          icon="calendar-outline"
          title={`Sin movimientos en ${cierre.etiqueta}`}
          message="En ese mes no se registró ningún ingreso ni gasto, así que no hay nada que cerrar."
        />
      ) : (
        <>
          <CierreResumenCard etiqueta={cierre.etiqueta} resumen={cierre.resumen} titular={cierre.titular} />

          {cierre.sectores.length > 0 ? (
            <SectoresCierreCard
              sectores={cierre.sectores}
              resumen={cierre.resumenSectores}
              cuantosSePasaron={cierre.seExcedieron.length}
            />
          ) : null}

          {cierre.comparacion ? (
            <ComparacionCard
              comparacion={cierre.comparacion}
              etiquetaAnterior={cierre.etiquetaAnterior}
              parcial={false}
            />
          ) : null}

          {cierre.puntos.length > 0 ? <PuntosCard puntos={cierre.puntos} /> : null}

          {filasTopGastos.length > 0 ? (
            <RankingCard titulo="Los gastos más grandes (pesos)" filas={filasTopGastos} />
          ) : null}

          {cierre.numeros.cantidadGastos > 0 ? <NumerosMesCard numeros={cierre.numeros} /> : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.negative,
  },
});