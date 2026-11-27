import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { ModalScreen } from '../components/common/ModalScreen';
import { FormularioCuenta } from '../components/sincronizacion/FormularioCuenta';
import { FormularioPareja } from '../components/sincronizacion/FormularioPareja';
import { SinConfigurar } from '../components/sincronizacion/SinConfigurar';
import { VistaPareja } from '../components/sincronizacion/VistaPareja';
import { useSesionStore } from '../store/useSesionStore';
import { fontSizes, fonts } from '../theme';
import { useEstilos, useTema } from '../theme/useTema';
import type { Tema } from '../theme/temas';

/** Ventana de sincronización: según el estado muestra instrucciones, cuenta, pareja o el resumen de la pareja. */
export default function SincronizacionScreen() {
  const styles = useEstilos(crearEstilos);
  const { colors } = useTema();
  const router = useRouter();
  const configurado = useSesionStore((s) => s.configurado);
  const cargando = useSesionStore((s) => s.cargando);
  const usuario = useSesionStore((s) => s.usuario);
  const pareja = useSesionStore((s) => s.pareja);
  const sinConexion = useSesionStore((s) => s.sinConexion);

  return (
    <ModalScreen title="Sincronizar con tu pareja" onClose={() => router.back()}>
      {sinConexion && usuario ? (
        <Text style={styles.aviso}>Sin conexión: se muestra lo último guardado en este teléfono.</Text>
      ) : null}

      {!configurado ? (
        <SinConfigurar />
      ) : cargando ? (
        <ActivityIndicator size="large" color={colors.primaryText} />
      ) : !usuario ? (
        <FormularioCuenta />
      ) : !pareja ? (
        <FormularioPareja />
      ) : (
        <VistaPareja pareja={pareja} />
      )}
    </ModalScreen>
  );
}

const crearEstilos = ({ colors }: Tema) => StyleSheet.create({
  aviso: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.warning,
  },
});