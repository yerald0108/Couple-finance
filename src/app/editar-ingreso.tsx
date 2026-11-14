import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Button } from '../components/common/Button';
import { ModalScreen } from '../components/common/ModalScreen';
import { FormularioIngreso, type IngresoInicial } from '../components/movimientos/FormularioIngreso';
import type { DatosIngreso } from '../db/queries/ingresos';
import { getIngreso } from '../db/queries/movimientos';
import { useEliminarMovimiento } from '../hooks/useEliminarMovimiento';
import { useCuentasStore } from '../store/useCuentasStore';
import { useSectoresStore } from '../store/useSectoresStore';
import { colors, fontSizes, fonts, spacing } from '../theme';
import { confirmar } from '../utils/dialogos';
import { mensajeError } from '../utils/errors';
import { formatFechaHora } from '../utils/fechas';

/**
 * Ventana para editar o eliminar un ingreso que ya existe.
 * La fecha y la hora del ingreso no cambian; se puede cambiar el monto, la forma, el origen y el reparto.
 */
export default function EditarIngresoScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { movimientoId } = useLocalSearchParams<{ movimientoId: string }>();
  const id = movimientoId ? String(movimientoId) : undefined;

  const cargarSectores = useSectoresStore((s) => s.cargar);
  const editarIngreso = useCuentasStore((s) => s.editarIngreso);

  const [inicial, setInicial] = useState<IngresoInicial | null>(null);
  const [fecha, setFecha] = useState<string | null>(null);
  const [noExiste, setNoExiste] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const { eliminar, eliminando, error: errorEliminar } = useEliminarMovimiento(
    id,
    {
      titulo: '¿Eliminar este ingreso?',
      mensaje:
        'Se quitará de tu saldo el dinero que sumó y se borrará su reparto entre sectores. ' +
        'No se puede deshacer desde la app.',
    },
    () => router.back(),
  );

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        if (!id) {
          setNoExiste(true);
          return;
        }
        await cargarSectores(db);
        const ingreso = await getIngreso(db, id);
        if (!activo) return;
        if (!ingreso) {
          setNoExiste(true);
          return;
        }
        const { movimiento, repartos } = ingreso;
        setFecha(movimiento.fecha);
        setInicial({
          monto: movimiento.monto,
          forma: movimiento.forma,
          origen: movimiento.origen ?? 'otro',
          repartos: repartos.map((r) => ({ sector_id: r.sector_id, monto: r.monto })),
        });
      } catch (e) {
        if (activo) setErrorCarga(mensajeError(e));
      }
    })();
    return () => {
      activo = false;
    };
  }, [db, id, cargarSectores]);

  async function guardar(datos: DatosIngreso): Promise<boolean> {
    if (!id) return false;
    const primero = await editarIngreso(db, id, datos);
    if (primero.estado === 'guardado') {
      router.back();
      return true;
    }

    // El cambio dejaría algún saldo en negativo: se avisa y se deja decidir.
    const seguir = await confirmar({
      titulo: 'Ojo con este cambio',
      mensaje: `${primero.avisos.join('\n\n')}\n\n¿Quieres guardarlo de todos modos?`,
      textoConfirmar: 'Guardar de todos modos',
      destructivo: true,
    });
    if (!seguir) return false;

    const segundo = await editarIngreso(db, id, datos, { confirmarExceso: true });
    if (segundo.estado === 'guardado') {
      router.back();
      return true;
    }
    return false;
  }

  return (
    <ModalScreen
      title="Editar ingreso"
      subtitle={fecha ? `Registrado el ${formatFechaHora(fecha)}` : undefined}
      onClose={() => router.back()}
    >
      {errorCarga ? (
        <Text style={styles.error}>No se pudo cargar el ingreso: {errorCarga}</Text>
      ) : noExiste ? (
        <Text style={styles.texto}>Este ingreso ya no existe.</Text>
      ) : !inicial ? (
        <Text style={styles.texto}>Cargando…</Text>
      ) : (
        <>
          <FormularioIngreso textoBoton="Guardar cambios" inicial={inicial} onGuardar={guardar} />

          {errorEliminar ? <Text style={styles.error}>{errorEliminar}</Text> : null}
          <View style={styles.eliminar}>
            <Button
              title="Eliminar ingreso"
              icon="trash-outline"
              variant="danger"
              onPress={eliminar}
              loading={eliminando}
            />
          </View>
        </>
      )}
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  texto: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.negative,
  },
  eliminar: {
    marginTop: spacing.sm,
  },
});