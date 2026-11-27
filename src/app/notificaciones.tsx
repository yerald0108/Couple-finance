import { Fragment, useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Card } from '../components/common/Card';
import { Divider } from '../components/common/Divider';
import { EmptyState } from '../components/common/EmptyState';
import { Screen } from '../components/common/Screen';
import { EsqueletoNotificaciones } from '../components/esqueletos/Esqueletos';
import { useEsqueleto } from '../hooks/useEsqueleto';
import { NotificacionItem } from '../components/notificaciones/NotificacionItem';
import { useNotificacionesStore } from '../store/useNotificacionesStore';
import { useSesionStore } from '../store/useSesionStore';
import { useSyncStore } from '../store/useSyncStore';
import { fontSizes, fonts } from '../theme';
import { useEstilos } from '../theme/useTema';
import type { Tema } from '../theme/temas';
import { autorDe } from '../utils/notificaciones';

/** Lo último que registraron tú y tu pareja. Tocar una notificación abre el detalle de ese movimiento. */
export default function NotificacionesScreen() {
  const styles = useEstilos(crearEstilos);
  const db = useSQLiteContext();
  const router = useRouter();

  const yoId = useSesionStore((s) => s.usuario?.id ?? null);
  const miembros = useSesionStore((s) => s.miembros);
  const hayPareja = useSesionStore((s) => s.pareja !== null);
  const datosVersion = useSyncStore((s) => s.datosVersion);

  const items = useNotificacionesStore((s) => s.items);
  const cargando = useNotificacionesStore((s) => s.cargando);
  const error = useNotificacionesStore((s) => s.error);
  const cargar = useNotificacionesStore((s) => s.cargar);
  const carga = useEsqueleto(cargando);
  const marcarVistas = useNotificacionesStore((s) => s.marcarVistas);

  // Los que eran nuevos al entrar siguen marcados mientras estás aquí, aunque ya se hayan marcado como vistos.
  const [nuevos, setNuevos] = useState<ReadonlySet<string>>(() => new Set());

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      (async () => {
        await cargar(db, yoId);
        if (!activo) return;
        const ids = useNotificacionesStore.getState().items.filter((i) => i.nuevo).map((i) => i.id);
        if (ids.length > 0) setNuevos((previos) => new Set([...previos, ...ids]));
        await marcarVistas(db);
      })();
      return () => {
        activo = false;
      };
    }, [db, yoId, datosVersion, cargar, marcarVistas]),
  );

  return (
    <Screen title="Notificaciones" subtitle="Lo que registran los dos" onBack={() => router.back()}>
      {error ? (
        <Card>
          <Text style={styles.error}>No se pudieron cargar los datos: {error}</Text>
        </Card>
      ) : carga === 'esqueleto' ? (
        <EsqueletoNotificaciones />
      ) : cargando ? null : items.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="Sin movimientos todavía"
          message="Cuando tú o tu pareja registren un ingreso o un gasto, aparecerá aquí."
        />
      ) : (
        <>
          <Card style={styles.lista}>
            {items.map((item, i) => (
              <Fragment key={item.id}>
                {i > 0 ? <Divider /> : null}
                <NotificacionItem
                  notificacion={item}
                  autor={autorDe(item.registrado_por, yoId, miembros)}
                  nuevo={nuevos.has(item.id)}
                  onPress={() => router.push(`/movimiento/${item.id}`)}
                />
              </Fragment>
            ))}
          </Card>
          <Text style={styles.nota}>
            {hayPareja
              ? 'Toca un movimiento para ver su detalle. Se muestran los últimos 50.'
              : 'Cuando conectes a tu pareja, aquí verás también lo que ella registre. Se muestran los últimos 50.'}
          </Text>
        </>
      )}
    </Screen>
  );
}

const crearEstilos = ({ colors }: Tema) => StyleSheet.create({
  lista: {
    padding: 0,
    overflow: 'hidden',
  },
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