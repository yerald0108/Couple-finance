import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '../components/common/Button';
import { TextField } from '../components/forms/TextField';
import { useSectoresStore } from '../store/useSectoresStore';
import { fontSizes, fonts, spacing } from '../theme';
import { useEstilos, useTema } from '../theme/useTema';
import type { Tema } from '../theme/temas';
import { mensajeError } from '../utils/errors';
import { NOMBRE_MAX, USO_MAX, validarSector } from '../utils/sectorValidation';

/** Formulario (ventana emergente) para crear un sector: nombre + uso del dinero. */
export default function NuevoSectorScreen() {
  const styles = useEstilos(crearEstilos);
  const { colors } = useTema();
  const db = useSQLiteContext();
  const router = useRouter();
  const sectores = useSectoresStore((s) => s.sectores);
  const agregar = useSectoresStore((s) => s.agregar);

  const [nombre, setNombre] = useState('');
  const [uso, setUso] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);

  const { valido, errores, datos } = validarSector({ nombre, descripcion: uso }, sectores);

  async function guardar() {
    setIntentado(true);
    setErrorGuardar(null);
    if (!valido) return;

    setGuardando(true);
    try {
      await agregar(db, datos);
      router.back();
    } catch (e) {
      setErrorGuardar(mensajeError(e));
      setGuardando(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Nuevo sector</Text>
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
          <Text style={styles.intro}>
            Un sector es un lugar donde guardas una parte de tu dinero para algo concreto.
          </Text>

          <TextField
            label="Nombre del sector"
            placeholder="Ej. Vacaciones"
            value={nombre}
            onChangeText={setNombre}
            maxLength={NOMBRE_MAX}
            autoCapitalize="sentences"
            returnKeyType="next"
            error={intentado ? errores.nombre : undefined}
          />

          <TextField
            label="Uso del dinero"
            placeholder="Ej. Ahorrar para el viaje de fin de año"
            helper="Para qué vas a usar este dinero."
            value={uso}
            onChangeText={setUso}
            maxLength={USO_MAX}
            multiline
            autoCapitalize="sentences"
            error={intentado ? errores.descripcion : undefined}
          />

          {errorGuardar ? <Text style={styles.saveError}>{errorGuardar}</Text> : null}

          <View style={styles.actions}>
            <Button title="Guardar sector" icon="checkmark" onPress={guardar} loading={guardando} />
            <Button title="Cancelar" variant="secondary" onPress={() => router.back()} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const crearEstilos = ({ colors }: Tema) => StyleSheet.create({
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.xxl,
    color: colors.text,
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
    lineHeight: 20,
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