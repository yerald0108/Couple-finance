import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '../../components/common/Screen';
import { BotonHistorial } from '../../components/movimientos/BotonHistorial';
import { FormularioIngreso } from '../../components/movimientos/FormularioIngreso';
import type { DatosIngreso } from '../../db/queries/ingresos';
import { useCuentasStore } from '../../store/useCuentasStore';
import { useSectoresStore } from '../../store/useSectoresStore';
import { useSyncStore } from '../../store/useSyncStore';
import { FORMA_LABEL } from '../../utils/constants';
import { monedaDeForma } from '../../utils/etiquetas';
import { formatMonto } from '../../utils/formatters';

export default function MovimientosScreen() {
  const db = useSQLiteContext();

  const cargarSectores = useSectoresStore((s) => s.cargar);
  const registrarIngreso = useCuentasStore((s) => s.registrarIngreso);

  // Sube cuando llegaron cambios de la pareja (por ejemplo, un sector nuevo suyo).
  const datosVersion = useSyncStore((s) => s.datosVersion);

  // Se leen los sectores cada vez que se entra (por si se creó uno nuevo en Billetera).
  useFocusEffect(
    useCallback(() => {
      void cargarSectores(db);
    }, [db, datosVersion, cargarSectores]),
  );

  async function guardar(datos: DatosIngreso): Promise<boolean> {
    await registrarIngreso(db, datos);
    const partes = datos.repartos.length;
    Alert.alert(
      'Ingreso guardado',
      `Se sumaron ${formatMonto(datos.monto, monedaDeForma(datos.forma))} a ${FORMA_LABEL[datos.forma]} ` +
        `y se repartieron entre ${partes} ${partes === 1 ? 'sector' : 'sectores'}.`,
    );
    return true;
  }

  return (
    <Screen title="Movimientos" subtitle="Registra un ingreso y repártelo" derecha={<BotonHistorial />}>
      <FormularioIngreso textoBoton="Guardar ingreso" limpiarAlGuardar onGuardar={guardar} />
    </Screen>
  );
}