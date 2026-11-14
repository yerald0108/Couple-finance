import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Button } from '../components/common/Button';
import { ModalScreen } from '../components/common/ModalScreen';
import { MontoInput } from '../components/forms/MontoInput';
import { OpcionesSelector } from '../components/forms/OpcionesSelector';
import { OPCIONES_FORMA } from '../components/forms/opcionesForma';
import { TextField } from '../components/forms/TextField';
import type { Movimiento, Sector } from '../db/schema';
import { getMovimiento } from '../db/queries/movimientos';
import { getSectores } from '../db/queries/sectores';
import { useEliminarMovimiento } from '../hooks/useEliminarMovimiento';
import { useCuentasStore } from '../store/useCuentasStore';
import { colors, fontSizes, fonts, spacing } from '../theme';
import type { FormaDinero, Moneda } from '../types';
import { confirmar } from '../utils/dialogos';
import { mensajeError } from '../utils/errors';
import { formatFechaHora } from '../utils/fechas';
import { limitesTexto, validarGasto } from '../utils/gastoValidation';
import { deCentavos } from '../utils/montos';

/**
 * Ventana de gastos de un sector (Gastos fijos, Gustos o uno propio) o de salidas de Ahorro
 * (en ese caso el motivo es obligatorio). Tiene dos modos:
 * - Nuevo: se abre con `sectorId`.
 * - Editar: se abre con `movimientoId`; permite cambiar los datos o eliminar el gasto.
 *   La fecha, la hora y el sector se mantienen.
 */
export default function NuevoGastoScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ sectorId?: string; movimientoId?: string }>();
  const movimientoId = params.movimientoId ? String(params.movimientoId) : undefined;
  const editando = movimientoId !== undefined;

  const registrarGasto = useCuentasStore((s) => s.registrarGasto);
  const editarGasto = useCuentasStore((s) => s.editarGasto);

  const [sector, setSector] = useState<Sector | null>(null);
  const [movimiento, setMovimiento] = useState<Movimiento | null>(null);
  const [noExiste, setNoExiste] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [montoTexto, setMontoTexto] = useState('');
  const [forma, setForma] = useState<FormaDinero | null>(null);
  const [texto, setTexto] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const bloqueo = useRef(false); // evita guardar dos veces si se toca el botón rápido

  // Se carga el sector (y, al editar, el gasto con sus datos para llenar el formulario).
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const sectores = await getSectores(db);
        if (!activo) return;

        if (movimientoId) {
          const mov = await getMovimiento(db, movimientoId);
          if (!activo) return;
          const delSector = mov ? sectores.find((s) => s.id === mov.sector_id) : undefined;
          if (!mov || mov.tipo === 'ingreso' || !delSector) {
            setNoExiste(true);
            return;
          }
          setMovimiento(mov);
          setSector(delSector);
          setMontoTexto(String(mov.monto));
          setForma(mov.forma);
          setTexto((delSector.tipo === 'ahorro' ? mov.motivo_ahorro : mov.concepto) ?? '');
        } else {
          const encontrado = sectores.find((s) => s.id === String(params.sectorId));
          if (!encontrado) setNoExiste(true);
          setSector(encontrado ?? null);
        }
      } catch (e) {
        if (activo) setErrorCarga(mensajeError(e));
      }
    })();
    return () => {
      activo = false;
    };
  }, [db, movimientoId, params.sectorId]);

  const esAhorro = sector?.tipo === 'ahorro';
  const limites = limitesTexto(esAhorro);
  const moneda: Moneda = forma === 'usd' ? 'USD' : 'CUP';

  const resultado = useMemo(
    () => validarGasto({ montoTexto, forma, texto, esAhorro }),
    [montoTexto, forma, texto, esAhorro],
  );

  const { eliminar, eliminando, error: errorEliminar } = useEliminarMovimiento(
    movimientoId,
    {
      titulo: esAhorro ? '¿Eliminar este retiro?' : '¿Eliminar este gasto?',
      mensaje:
        'El dinero vuelve a tu saldo y al sector. No se puede deshacer desde la app.',
    },
    () => router.back(),
  );

  async function guardar() {
    if (bloqueo.current || !sector) return;
    setIntentado(true);
    setErrorGuardar(null);

    const { valido, montoCentavos, texto: textoLimpio } = resultado;
    if (!valido || montoCentavos === null || forma === null) return;

    bloqueo.current = true;
    setGuardando(true);
    try {
      const datos = { monto: deCentavos(montoCentavos), forma, texto: textoLimpio };
      const guardar = (confirmarExceso: boolean) =>
        movimientoId
          ? editarGasto(db, movimientoId, datos, { confirmarExceso })
          : registrarGasto(db, { ...datos, sector_id: sector.id }, { confirmarExceso });

      const primero = await guardar(false);
      if (primero.estado === 'guardado') {
        router.back();
        return;
      }

      // El gasto supera lo disponible: se avisa y se deja decidir.
      const seguir = await confirmar({
        titulo: 'Ojo con este gasto',
        mensaje: `${primero.avisos.join('\n\n')}\n\n¿Quieres guardarlo de todos modos?`,
        textoConfirmar: 'Guardar de todos modos',
        destructivo: true,
      });
      if (!seguir) return;

      const segundo = await guardar(true);
      if (segundo.estado === 'guardado') router.back();
    } catch (e) {
      setErrorGuardar(mensajeError(e));
    } finally {
      bloqueo.current = false;
      setGuardando(false);
    }
  }

  const titulo = editando
    ? esAhorro
      ? 'Editar retiro'
      : 'Editar gasto'
    : esAhorro
      ? 'Retirar de ahorro'
      : 'Añadir gasto';
  const subtitulo = sector
    ? movimiento
      ? `Sector: ${sector.nombre} · ${formatFechaHora(movimiento.fecha)}`
      : `Sector: ${sector.nombre}`
    : undefined;
  const textoBoton = editando ? 'Guardar cambios' : esAhorro ? 'Guardar retiro' : 'Guardar gasto';

  return (
    <ModalScreen title={titulo} subtitle={subtitulo} onClose={() => router.back()}>
      {errorCarga ? (
        <Text style={styles.error}>No se pudo cargar: {errorCarga}</Text>
      ) : noExiste ? (
        <Text style={styles.texto}>
          {editando ? 'Este gasto ya no existe.' : 'Este sector ya no existe.'}
        </Text>
      ) : !sector ? (
        <Text style={styles.texto}>Cargando…</Text>
      ) : (
        <>
          <MontoInput
            label={esAhorro ? 'Monto a retirar' : 'Monto del gasto'}
            value={montoTexto}
            onChangeText={setMontoTexto}
            moneda={moneda}
            error={intentado ? resultado.errores.monto : undefined}
          />

          <OpcionesSelector
            label="Forma de dinero"
            opciones={OPCIONES_FORMA}
            valor={forma}
            onChange={setForma}
            columnas={3}
            error={intentado ? resultado.errores.forma : undefined}
          />

          <TextField
            label={esAhorro ? 'Motivo de la salida' : 'Concepto'}
            placeholder={esAhorro ? 'Ej. emergencia' : 'Ej. arroz, jabón, aceite'}
            helper={esAhorro ? 'Obligatorio: explica para qué sacas el dinero.' : undefined}
            value={texto}
            onChangeText={setTexto}
            maxLength={limites.max}
            autoCapitalize="sentences"
            error={intentado ? resultado.errores.texto : undefined}
          />

          {errorGuardar ? <Text style={styles.error}>{errorGuardar}</Text> : null}
          {errorEliminar ? <Text style={styles.error}>{errorEliminar}</Text> : null}

          <View style={styles.actions}>
            <Button title={textoBoton} icon="checkmark" onPress={guardar} loading={guardando} />
            {editando ? (
              <Button
                title={esAhorro ? 'Eliminar retiro' : 'Eliminar gasto'}
                icon="trash-outline"
                variant="danger"
                onPress={eliminar}
                loading={eliminando}
              />
            ) : null}
            <Button title="Cancelar" variant="secondary" onPress={() => router.back()} />
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
  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});