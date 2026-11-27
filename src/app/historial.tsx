import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { PantallaLista } from '../components/common/PantallaLista';
import { Screen } from '../components/common/Screen';
import { EsqueletoHistorial } from '../components/esqueletos/Esqueletos';
import { FiltrosHistorial } from '../components/historial/FiltrosHistorial';
import { NotificacionItem } from '../components/notificaciones/NotificacionItem';
import { getHistorial, type ListaHistorial, type MovimientoHistorial } from '../db/queries/historial';
import { useEsqueleto } from '../hooks/useEsqueleto';
import { useSesionStore } from '../store/useSesionStore';
import { useSyncStore } from '../store/useSyncStore';
import { fontSizes, fonts } from '../theme';
import { useEstilos } from '../theme/useTema';
import type { Tema } from '../theme/temas';
import { mensajeError } from '../utils/errors';
import {
  PAGINA_HISTORIAL,
  limiteSiguiente,
  textoFechaHistorial,
  type FiltroTipo,
  type MesFiltro,
} from '../utils/historial';
import { autorDe } from '../utils/notificaciones';

const claveFila = (m: MovimientoHistorial) => m.id;

/** Lo que se leyó, y con qué límite (para saber si ya llegó lo que se pidió antes de pedir más). */
interface Lectura {
  datos: ListaHistorial;
  limite: number;
}

/**
 * Todos los movimientos de los dos, de todos los meses, los más nuevos primero.
 * Se filtra por tipo (todos / ingresos / gastos) y por mes. Se leen 50 y, al llegar al final de la lista,
 * 50 más. Tocar un movimiento abre su detalle.
 */
export default function HistorialScreen() {
  const styles = useEstilos(crearEstilos);
  const db = useSQLiteContext();
  const router = useRouter();

  const yoId = useSesionStore((s) => s.usuario?.id ?? null);
  const miembros = useSesionStore((s) => s.miembros);
  // Sube cuando llegaron cambios de la pareja: se vuelve a leer la lista.
  const datosVersion = useSyncStore((s) => s.datosVersion);

  const [tipo, setTipo] = useState<FiltroTipo>('todos');
  const [mes, setMes] = useState<MesFiltro | null>(null);
  const [limite, setLimite] = useState(PAGINA_HISTORIAL);
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const [error, setError] = useState<string | null>(null);
  const carga = useEsqueleto(lectura === null && error === null);

  // Se lee al entrar, al volver (por ejemplo, tras editar o eliminar un movimiento), al cambiar el filtro y al pedir más.
  useFocusEffect(
    useCallback(() => {
      let activo = true;
      (async () => {
        try {
          const datos = await getHistorial(db, { tipo, mes }, limite);
          if (!activo) return;
          setLectura({ datos, limite });
          setError(null);
        } catch (e) {
          if (activo) setError(mensajeError(e));
        }
      })();
      return () => {
        activo = false;
      };
    }, [db, tipo, mes, limite, datosVersion]),
  );

  // Cambiar un filtro vuelve a empezar desde los 50 más nuevos.
  const cambiarTipo = useCallback((nuevo: FiltroTipo) => {
    setTipo(nuevo);
    setLimite(PAGINA_HISTORIAL);
  }, []);
  const cambiarMes = useCallback((nuevo: MesFiltro | null) => {
    setMes(nuevo);
    setLimite(PAGINA_HISTORIAL);
  }, []);

  // Al llegar al final se piden 50 más, pero solo si ya llegó lo que se pidió antes (la lista avisa varias veces seguidas).
  const pedirMas = useCallback(() => {
    if (!lectura) return;
    const siguiente = limiteSiguiente(lectura.datos.hayMas, lectura.limite, limite);
    if (siguiente !== null) setLimite(siguiente);
  }, [lectura, limite]);

  const volver = useCallback(() => router.back(), [router]);
  const verDetalle = useCallback((id: string) => router.push(`/movimiento/${id}`), [router]);

  if (error) {
    return (
      <Screen title="Historial" subtitle="Todo lo que registran los dos" onBack={volver}>
        <Card>
          <Text style={styles.error}>No se pudieron cargar los datos: {error}</Text>
        </Card>
      </Screen>
    );
  }

  if (lectura === null) {
    return (
      <Screen title="Historial" subtitle="Todo lo que registran los dos" onBack={volver}>
        {carga === 'esqueleto' ? <EsqueletoHistorial /> : null}
      </Screen>
    );
  }

  const { items, hayMas, primerMes } = lectura.datos;
  const hayFiltro = tipo !== 'todos' || mes !== null;

  return (
    <PantallaLista
      title="Historial"
      subtitle="Todo lo que registran los dos"
      onBack={volver}
      encabezado={
        <FiltrosHistorial tipo={tipo} onTipoChange={cambiarTipo} mes={mes} onMesChange={cambiarMes} primerMes={primerMes} />
      }
      data={items}
      keyExtractor={claveFila}
      renderItem={(movimiento) => (
        <NotificacionItem
          notificacion={movimiento}
          autor={autorDe(movimiento.registrado_por, yoId, miembros)}
          nuevo={false}
          cuando={textoFechaHistorial(movimiento.fecha)}
          sinRelleno
          onPress={() => verDetalle(movimiento.id)}
        />
      )}
      vacio={
        hayFiltro ? (
          <EmptyState
            icon="filter-outline"
            title="Nada con este filtro"
            message="Prueba con otro tipo o con otro mes, o vuelve a Todos los meses."
          />
        ) : (
          <EmptyState
            icon="receipt-outline"
            title="Sin movimientos todavía"
            message="Cuando tú o tu pareja registren un ingreso o un gasto, aparecerá aquí."
          />
        )
      }
      pie={
        <Text style={styles.nota}>
          {hayMas
            ? 'Sigue bajando para ver más movimientos.'
            : `Toca un movimiento para ver su detalle. ${items.length} ${items.length === 1 ? 'movimiento' : 'movimientos'}.`}
        </Text>
      }
      alLlegarAlFinal={pedirMas}
    />
  );
}

const crearEstilos = ({ colors }: Tema) => StyleSheet.create({
  nota: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.negative,
  },
});