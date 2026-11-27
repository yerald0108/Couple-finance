import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Button } from '../components/common/Button';
import { ModalScreen } from '../components/common/ModalScreen';
import { MontoInput } from '../components/forms/MontoInput';
import { OpcionesSelector, type Opcion } from '../components/forms/OpcionesSelector';
import { OPCIONES_FORMA } from '../components/forms/opcionesForma';
import { TextField } from '../components/forms/TextField';
import { getCuentas } from '../db/queries/cuentas';
import { getMovimiento } from '../db/queries/movimientos';
import { getSaldoSectorPorForma } from '../db/queries/saldosSectores';
import { getSectores } from '../db/queries/sectores';
import type { Movimiento, Sector } from '../db/schema';
import { useEliminarMovimiento } from '../hooks/useEliminarMovimiento';
import { useCuentasStore } from '../store/useCuentasStore';
import { fontSizes, fonts, spacing } from '../theme';
import { useEstilos } from '../theme/useTema';
import type { Tema } from '../theme/temas';
import type { FormaDinero, Moneda } from '../types';
import { mensajeError } from '../utils/errors';
import { formatFechaHora } from '../utils/fechas';
import { limitesTexto, validarGasto } from '../utils/gastoValidation';
import { aCentavos, deCentavos } from '../utils/montos';
import { bloqueosGasto, disponibleParaGastar } from '../utils/saldoForma';

const FORMAS: FormaDinero[] = ['efectivo', 'transferencia', 'usd'];

/** Lo que hay en la cuenta y en el sector en cada forma de dinero, en centavos. */
interface Disponibles {
  cuenta: Record<FormaDinero, number>;
  sector: Record<FormaDinero, number>;
}

/**
 * Ventana de gastos de un sector (Gastos fijos, Gustos o uno propio) o de salidas de Ahorro
 * (en ese caso el motivo es obligatorio). Solo se puede gastar el dinero que hay en cada forma de dinero
 * (efectivo, transferencia o USD): si una se agotó, no se puede elegir. Tiene dos modos:
 * - Nuevo: se abre con `sectorId`.
 * - Editar: se abre con `movimientoId`; permite cambiar los datos o eliminar el gasto.
 *   La fecha, la hora y el sector se mantienen.
 */
export default function NuevoGastoScreen() {
  const styles = useEstilos(crearEstilos);
  const db = useSQLiteContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ sectorId?: string; movimientoId?: string }>();
  const movimientoId = params.movimientoId ? String(params.movimientoId) : undefined;
  const editando = movimientoId !== undefined;

  const registrarGasto = useCuentasStore((s) => s.registrarGasto);
  const editarGasto = useCuentasStore((s) => s.editarGasto);

  const [sector, setSector] = useState<Sector | null>(null);
  const [movimiento, setMovimiento] = useState<Movimiento | null>(null);
  const [disponibles, setDisponibles] = useState<Disponibles | null>(null);
  const [noExiste, setNoExiste] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [montoTexto, setMontoTexto] = useState('');
  const [forma, setForma] = useState<FormaDinero | null>(null);
  const [texto, setTexto] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const bloqueo = useRef(false); // evita guardar dos veces si se toca el botón rápido

  // Se carga el sector (y, al editar, el gasto con sus datos para llenar el formulario) y lo que hay en cada forma.
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const sectores = await getSectores(db);
        const mov = movimientoId ? await getMovimiento(db, movimientoId) : null;
        const encontrado = sectores.find(
          (s) => s.id === (movimientoId ? mov?.sector_id : String(params.sectorId)),
        );
        if (!activo) return;
        if (!encontrado || (movimientoId && (!mov || mov.tipo === 'ingreso'))) {
          setNoExiste(true);
          return;
        }

        const [cuentas, porForma] = await Promise.all([
          getCuentas(db),
          getSaldoSectorPorForma(db, encontrado.id),
        ]);
        if (!activo) return;

        const cuenta: Record<FormaDinero, number> = { efectivo: 0, transferencia: 0, usd: 0 };
        for (const c of cuentas) cuenta[c.tipo] = aCentavos(c.saldo);
        setDisponibles({
          cuenta,
          sector: {
            efectivo: aCentavos(porForma.efectivo),
            transferencia: aCentavos(porForma.transferencia),
            usd: aCentavos(porForma.usd),
          },
        });

        if (mov) {
          setMovimiento(mov);
          setMontoTexto(String(mov.monto));
          setForma(mov.forma);
          setTexto((encontrado.tipo === 'ahorro' ? mov.motivo_ahorro : mov.concepto) ?? '');
        }
        setSector(encontrado);
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

  // Al editar, lo que el gasto ya había descontado vuelve a estar disponible (solo en su misma forma).
  const disponiblePorForma = useMemo(() => {
    const d: Record<FormaDinero, number> = { efectivo: 0, transferencia: 0, usd: 0 };
    if (!disponibles) return d;
    for (const f of FORMAS) {
      d[f] = disponibleParaGastar({
        cuentaCentavos: disponibles.cuenta[f],
        sectorCentavos: disponibles.sector[f],
        devueltoCentavos: movimiento && movimiento.forma === f ? aCentavos(movimiento.monto) : 0,
      });
    }
    return d;
  }, [disponibles, movimiento]);

  // Una forma agotada no se puede elegir (salvo la que ya tiene el gasto que se está editando).
  const opcionesForma: Opcion<FormaDinero>[] = OPCIONES_FORMA.map((o) => {
    const agotada = disponiblePorForma[o.value] <= 0;
    return {
      ...o,
      deshabilitada: agotada && o.value !== movimiento?.forma,
      nota: agotada ? 'Agotado' : undefined,
    };
  });
  const todoAgotado = disponibles !== null && FORMAS.every((f) => disponiblePorForma[f] <= 0);

  // Motivos por los que lo escrito no alcanza (se muestran mientras se escribe).
  const bloqueos = useMemo(() => {
    if (!sector || !disponibles || !forma || resultado.montoCentavos === null) return [];
    return bloqueosGasto({
      montoCentavos: resultado.montoCentavos,
      forma,
      sectorNombre: sector.nombre,
      cuentaCentavos: disponibles.cuenta[forma],
      sectorCentavos: disponibles.sector[forma],
      devueltoCentavos: movimiento && movimiento.forma === forma ? aCentavos(movimiento.monto) : 0,
    });
  }, [sector, disponibles, forma, resultado.montoCentavos, movimiento]);

  const errorMonto =
    (intentado ? resultado.errores.monto : undefined) ??
    (bloqueos.length > 0 ? bloqueos.join('\n') : undefined);

  const { eliminar, eliminando, error: errorEliminar } = useEliminarMovimiento(
    movimientoId,
    {
      titulo: esAhorro ? '¿Eliminar este retiro?' : '¿Eliminar este gasto?',
      mensaje: 'El dinero vuelve a tu saldo y al sector. No se puede deshacer desde la app.',
    },
    () => router.back(),
  );

  async function guardar() {
    if (bloqueo.current || !sector) return;
    setIntentado(true);
    setErrorGuardar(null);

    const { valido, montoCentavos, texto: textoLimpio } = resultado;
    if (!valido || montoCentavos === null || forma === null) return;
    if (bloqueos.length > 0) return; // el motivo ya se ve bajo el monto

    bloqueo.current = true;
    setGuardando(true);
    try {
      const datos = { monto: deCentavos(montoCentavos), forma, texto: textoLimpio };
      const guardado = movimientoId
        ? await editarGasto(db, movimientoId, datos)
        : await registrarGasto(db, { ...datos, sector_id: sector.id });

      if (guardado.estado === 'guardado') {
        router.back();
        return;
      }
      // La base de datos también comprueba el saldo: si cambió mientras tanto, no se guarda.
      setErrorGuardar(guardado.avisos.join('\n'));
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
          {todoAgotado ? (
            <Text style={styles.aviso}>
              Este sector no tiene dinero disponible en ninguna forma. Registra un ingreso y repártelo
              aquí para poder gastar.
            </Text>
          ) : null}

          <MontoInput
            label={esAhorro ? 'Monto a retirar' : 'Monto del gasto'}
            value={montoTexto}
            onChangeText={setMontoTexto}
            moneda={moneda}
            error={errorMonto}
          />

          <OpcionesSelector
            label="Forma de dinero"
            opciones={opcionesForma}
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
            <Button
              title={textoBoton}
              icon="checkmark"
              onPress={guardar}
              loading={guardando}
              disabled={todoAgotado && !editando}
            />
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

const crearEstilos = ({ colors }: Tema) => StyleSheet.create({
  texto: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  aviso: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.negative,
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