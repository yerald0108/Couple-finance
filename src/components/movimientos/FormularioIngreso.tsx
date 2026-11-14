import { Fragment, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { DatosIngreso } from '../../db/queries/ingresos';
import { useSectoresStore } from '../../store/useSectoresStore';
import { colors, fontSizes, fonts, spacing } from '../../theme';
import type { FormaDinero, Moneda, OrigenIngreso } from '../../types';
import { ORIGENES } from '../../utils/constants';
import { mensajeError } from '../../utils/errors';
import { validarIngreso } from '../../utils/ingresoValidation';
import { deCentavos } from '../../utils/montos';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Divider } from '../common/Divider';
import { SectionTitle } from '../common/SectionTitle';
import { MontoInput } from '../forms/MontoInput';
import { OpcionesSelector } from '../forms/OpcionesSelector';
import { OPCIONES_FORMA } from '../forms/opcionesForma';
import { RepartoResumen } from './RepartoResumen';
import { RepartoSectorRow } from './RepartoSectorRow';

/** Valores con los que arranca el formulario cuando se edita un ingreso que ya existe. */
export interface IngresoInicial {
  monto: number;
  forma: FormaDinero;
  origen: OrigenIngreso;
  repartos: { sector_id: string; monto: number }[];
}

interface FormularioIngresoProps {
  /** Texto del botón de guardar. */
  textoBoton: string;
  inicial?: IngresoInicial;
  /** Guarda el ingreso. Debe devolver true si se guardó (si devuelve false, el formulario se queda como está). */
  onGuardar: (datos: DatosIngreso) => Promise<boolean>;
  /** true = al guardar, el formulario se vacía para registrar otro (se usa al crear, no al editar). */
  limpiarAlGuardar?: boolean;
}

/**
 * Formulario de ingreso: monto, forma de dinero, origen y reparto entre sectores.
 * Lo usan la pestaña Movimientos (crear) y la pantalla de editar ingreso.
 * Los sectores se leen del store: quien lo use debe haberlos cargado.
 */
export function FormularioIngreso({
  textoBoton,
  inicial,
  onGuardar,
  limpiarAlGuardar = false,
}: FormularioIngresoProps) {
  const sectores = useSectoresStore((s) => s.sectores);

  const [montoTexto, setMontoTexto] = useState(() => (inicial ? String(inicial.monto) : ''));
  const [forma, setForma] = useState<FormaDinero | null>(inicial?.forma ?? null);
  const [origen, setOrigen] = useState<OrigenIngreso | null>(inicial?.origen ?? null);
  const [repartos, setRepartos] = useState<Record<string, string>>(() =>
    Object.fromEntries((inicial?.repartos ?? []).map((r) => [r.sector_id, String(r.monto)])),
  );
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const bloqueo = useRef(false); // evita guardar dos veces si se toca el botón rápido

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
      const guardado = await onGuardar({
        monto: deCentavos(montoCentavos),
        forma,
        origen,
        repartos: partes,
      });
      if (guardado && limpiarAlGuardar) limpiarFormulario();
    } catch (e) {
      setErrorGuardar(mensajeError(e));
    } finally {
      bloqueo.current = false;
      setGuardando(false);
    }
  }

  return (
    <>
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
        <Button title={textoBoton} icon="checkmark" onPress={guardar} loading={guardando} />
      </View>
    </>
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