import { Fragment, useCallback, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Divider } from '../../components/common/Divider';
import { Screen } from '../../components/common/Screen';
import { SectionTitle } from '../../components/common/SectionTitle';
import { MontoInput } from '../../components/forms/MontoInput';
import { OpcionesSelector, type Opcion } from '../../components/forms/OpcionesSelector';
import { RepartoResumen } from '../../components/movimientos/RepartoResumen';
import { RepartoSectorRow } from '../../components/movimientos/RepartoSectorRow';
import { useCuentasStore } from '../../store/useCuentasStore';
import { useSectoresStore } from '../../store/useSectoresStore';
import { colors, fontSizes, fonts, formaColors, spacing } from '../../theme';
import { formaIconos } from '../../theme/iconos';
import type { FormaDinero, Moneda, OrigenIngreso } from '../../types';
import { FORMA_LABEL, ORIGENES } from '../../utils/constants';
import { mensajeError } from '../../utils/errors';
import { formatMonto } from '../../utils/formatters';
import { validarIngreso } from '../../utils/ingresoValidation';
import { deCentavos } from '../../utils/montos';

const OPCIONES_FORMA: Opcion<FormaDinero>[] = (['efectivo', 'transferencia', 'usd'] as const).map(
  (forma) => ({
    value: forma,
    label: FORMA_LABEL[forma],
    icon: formaIconos[forma],
    color: formaColors[forma],
  }),
);

export default function MovimientosScreen() {
  const db = useSQLiteContext();

  const sectores = useSectoresStore((s) => s.sectores);
  const cargarSectores = useSectoresStore((s) => s.cargar);
  const registrarIngreso = useCuentasStore((s) => s.registrarIngreso);

  // Formulario
  const [montoTexto, setMontoTexto] = useState('');
  const [forma, setForma] = useState<FormaDinero | null>(null);
  const [origen, setOrigen] = useState<OrigenIngreso | null>(null);
  const [repartos, setRepartos] = useState<Record<string, string>>({});
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const bloqueo = useRef(false); // evita guardar dos veces si se toca el botón rápido

  // Se leen los sectores cada vez que se entra (por si se creó uno nuevo en Billetera).
  useFocusEffect(
    useCallback(() => {
      void cargarSectores(db);
    }, [db, cargarSectores]),
  );

  // El dinero se reparte entre todos los sectores menos "Ingresos" (donde queda registrado).
  const sectoresReparto = useMemo(() => sectores.filter((s) => s.tipo !== 'ingresos'), [sectores]);

  const moneda: Moneda = forma === 'usd' ? 'USD' : 'CUP';
  const resultado = useMemo(
    () => validarIngreso({ montoTexto, forma, origen, repartos }, sectoresReparto),
    [montoTexto, forma, origen, repartos, sectoresReparto],
  );

  function cambiarReparto(sectorId: string, texto: string) {
    setRepartos((actual) => ({ ...actual, [sectorId]: texto }));
  }

  function limpiarFormulario() {
    setMontoTexto('');
    setForma(null);
    setOrigen(null);
    setRepartos({});
    setIntentado(false);
    setErrorGuardar(null);
  }

  async function guardar() {
    if (bloqueo.current) return;
    setIntentado(true);
    setErrorGuardar(null);

    const { valido, montoCentavos, repartos: partes } = resultado;
    if (!valido || montoCentavos === null || forma === null || origen === null) return;

    bloqueo.current = true;
    setGuardando(true);
    try {
      await registrarIngreso(db, {
        monto: deCentavos(montoCentavos),
        forma,
        origen,
        repartos: partes,
      });
      limpiarFormulario();
      Alert.alert(
        'Ingreso guardado',
        `Se sumaron ${formatMonto(deCentavos(montoCentavos), moneda)} a ${FORMA_LABEL[forma]} ` +
          `y se repartieron entre ${partes.length} ${partes.length === 1 ? 'sector' : 'sectores'}.`,
      );
    } catch (e) {
      setErrorGuardar(mensajeError(e));
    } finally {
      bloqueo.current = false;
      setGuardando(false);
    }
  }

  return (
    <Screen title="Movimientos" subtitle="Registra un ingreso y repártelo">
      <MontoInput
        label="Monto del ingreso"
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

      <OpcionesSelector
        label="Origen"
        opciones={ORIGENES}
        valor={origen}
        onChange={setOrigen}
        columnas={2}
        error={intentado ? resultado.errores.origen : undefined}
      />

      <SectionTitle title="Repartir el dinero" />
      <RepartoResumen
        montoCentavos={resultado.montoCentavos}
        repartidoCentavos={resultado.repartidoCentavos}
        moneda={moneda}
      />

      <Card style={styles.listCard}>
        {sectoresReparto.map((sector, i) => (
          <Fragment key={sector.id}>
            {i > 0 ? <Divider /> : null}
            <RepartoSectorRow
              sector={sector}
              valor={repartos[sector.id] ?? ''}
              onChange={(texto) => cambiarReparto(sector.id, texto)}
              moneda={moneda}
            />
          </Fragment>
        ))}
      </Card>

      {intentado && resultado.errores.reparto ? (
        <Text style={styles.error}>{resultado.errores.reparto}</Text>
      ) : null}
      {errorGuardar ? <Text style={styles.error}>{errorGuardar}</Text> : null}

      <View style={styles.actions}>
        <Button
          title="Guardar ingreso"
          icon="checkmark"
          onPress={guardar}
          loading={guardando}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  listCard: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 4,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.negative,
  },
  actions: {
    marginTop: spacing.sm,
  },
});