import { Suspense, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
// Cada peso se importa de su propia carpeta: importar del paquete raíz mete en la app las 18 fuentes de Inter
// (unos 6 MB), aunque solo se usen tres.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { SesionIniciador } from '../components/sincronizacion/SesionIniciador';
import { SyncIniciador } from '../components/sincronizacion/SyncIniciador';
import { DATABASE_NAME, initDatabase } from '../db/database';
import { useTemaStore } from '../store/useTemaStore';
import { temaClaro, temaOscuro, type Tema } from '../theme/temas';
import { useTema } from '../theme/useTema';

// La pantalla de carga (morada, con el icono) se queda visible hasta que las fuentes estén listas, en lugar de
// dar paso a una pantalla en blanco con un círculo girando. Se llama aquí, fuera de los componentes y sin esperar.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

/**
 * Color de la pantalla de carga: el mismo morado de la pantalla de inicio. Mientras carga todavía no se sabe qué modo
 * eligió la persona (se lee de la base), así que esta pantalla no depende del modo y no parpadea con el equivocado.
 */
const COLOR_CARGA = '#B15FA4';

function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#FFFFFF" />
    </View>
  );
}

/** Abre la base y, antes de dibujar nada de la app, lee el modo claro/oscuro guardado: así no se ve un instante el modo equivocado. */
async function iniciarBase(db: SQLiteDatabase): Promise<void> {
  await initDatabase(db);
  await useTemaStore.getState().cargar(db);
}

/** Los colores de las ventanas y transiciones de la navegación (lo que se ve detrás de cada pantalla). */
function temaNavegacion(tema: Tema) {
  const base = tema.esquema === 'oscuro' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: tema.colors.primaryText,
      background: tema.colors.background,
      card: tema.colors.surface,
      text: tema.colors.text,
      border: tema.colors.border,
    },
  };
}

const navegacionClara = temaNavegacion(temaClaro);
const navegacionOscura = temaNavegacion(temaOscuro);

/**
 * Layout raíz: carga la fuente Inter y abre la base de datos local
 * (creando tablas y datos iniciales la primera vez) antes de mostrar las pantallas.
 */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const fuentesListas = fontsLoaded || fontError !== null;
  const tema = useTema();
  const fondo = tema.colors.background;

  // El fondo de la ventana (lo que se ve al abrir el teclado o durante una transición) sigue al modo.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(fondo).catch(() => undefined);
  }, [fondo]);

  // Se oculta cuando las fuentes cargaron o fallaron (si fallan, la app sigue con la letra del sistema): nunca se queda puesta.
  useEffect(() => {
    if (fuentesListas) SplashScreen.hide();
  }, [fuentesListas]);

  if (!fuentesListas) {
    return <Loading />;
  }

  return (
    <Suspense fallback={<Loading />}>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={iniciarBase} useSuspense>
        <ThemeProvider value={tema.esquema === 'oscuro' ? navegacionOscura : navegacionClara}>
          {/* Iconos de la barra de estado: oscuros sobre fondo claro, claros sobre fondo oscuro. */}
          <StatusBar style={tema.esquema === 'oscuro' ? 'light' : 'dark'} />
          <SesionIniciador />
          <SyncIniciador />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: fondo } }}>
            <Stack.Screen name="nuevo-sector" options={{ presentation: 'modal' }} />
            <Stack.Screen name="nuevo-gasto" options={{ presentation: 'modal' }} />
            <Stack.Screen name="editar-ingreso" options={{ presentation: 'modal' }} />
            <Stack.Screen name="sincronizacion" options={{ presentation: 'modal' }} />
            <Stack.Screen name="tema" options={{ presentation: 'modal' }} />
          </Stack>
        </ThemeProvider>
      </SQLiteProvider>
    </Suspense>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLOR_CARGA,
  },
});