import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/common/Button';
import { MontoInput } from '../components/forms/MontoInput';
import { OpcionesSelector } from '../components/forms/OpcionesSelector';
import { OPCIONES_FORMA } from '../components/forms/opcionesForma';
import { TextField } from '../components/forms/TextField';
import type { Sector } from '../db/schema';
import { getSectores } from '../db/queries/sectores';
import { useCuentasStore } from '../store/useCuentasStore';
import { colors, fontSizes, fonts, spacing } from '../theme';
import type { FormaDinero, Moneda } from '../types';
import { mensajeError } from '../utils/errors';
import { limitesTexto, validarGasto } from '../utils/gastoValidation';
import { deCentavos } from '../utils/montos';

/**
 * Ventana para añadir un gasto a un sector (Gastos fijos, Gustos o uno propio)
 * o para retirar dinero de Ahorro (en ese caso el motivo es obligatorio).
 */
export default function NuevoGastoScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { sectorId } = useLocalSearchParams<{ sectorId: string }>();
  const registrarGasto = useCuentasStore((s) => s.registrarGasto);

  const [sector, setSector] = useState<Sector | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [montoTexto, setMontoTexto] = useState('');
  const [forma, setForma] = useState<FormaDinero | null>(null);
  const [texto, setTexto] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const bloqueo = useRef(false); // evita guardar dos veces si se toca el botón rápido

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const sectores = await getSectores(db);
        if (!activo) return;
        setSector(sectores.find((s) => s.id === String(sectorId)) ?? null);
      } catch (e) {
        if (activo) setErrorCarga(mensajeError(e));
      }
    })();
    return () => {
      activo = false;
    };
  }, [db, sectorId]);

  const esAhorro = sector?.tipo === 'ahorro';
  const limites = limitesTexto(esAhorro);
  const moneda: Moneda = forma === 'usd' ? 'USD' : 'CUP';

  const resultado = useMemo(
    () => validarGasto({ montoTexto, forma, texto, esAhorro }),
    [montoTexto, forma, texto, esAhorro],
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
      const datos = {
        sector_id: sector.id,
        monto: deCentavos(montoCentavos),
        forma,
        texto: textoLimpio,
      };
      const primero = await registrarGasto(db, datos);

      if (primero.estado === 'guardado') {
        router.back();
        return;
      }

      // El gasto supera lo disponible: se avisa y se deja decidir.
      const confirmar = await preguntarExceso(primero.avisos);
      if (!confirmar) return;

      const segundo = await registrarGasto(db, datos, { confirmarExceso: true });
      if (segundo.estado === 'guardado') router.back();
    } catch (e) {
      setErrorGuardar(mensajeError(e));
    } finally {
      bloqueo.current = false;
      setGuardando(false);
    }
  }

  // Aviso previo: el gasto se guarda solo si la persona lo confirma.
  function preguntarExceso(avisos: string[]): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'Ojo con este gasto',
        `${avisos.join('\n\n')}\n\n¿Quieres guardarlo de todos modos?`,
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Guardar de todos modos', style: 'destructive', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
  }

  const titulo = esAhorro ? 'Retirar de ahorro' : 'Añadir gasto';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <View style={styles.titles}>
            <Text style={styles.title} numberOfLines={1}>
              {titulo}
            </Text>
            {sector ? <Text style={styles.subtitle}>Sector: {sector.nombre}</Text> : null}
          </View>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            style={styles.close}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {errorCarga ? (
            <Text style={styles.saveError}>No se pudo cargar el sector: {errorCarga}</Text>
          ) : !sector ? (
            <Text style={styles.intro}>Cargando…</Text>
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

              {errorGuardar ? <Text style={styles.saveError}>{errorGuardar}</Text> : null}

              <View style={styles.actions}>
                <Button
                  title={esAhorro ? 'Guardar retiro' : 'Guardar gasto'}
                  icon="checkmark"
                  onPress={guardar}
                  loading={guardando}
                />
                <Button title="Cancelar" variant="secondary" onPress={() => router.back()} />
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  titles: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xxl,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  intro: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  saveError: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.negative,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});