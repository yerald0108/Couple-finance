import { Suspense, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
// Cada peso se importa de su propia carpeta: importar del paquete raíz mete en la app las 18 fuentes de Inter
// (unos 6 MB), aunque solo se usen tres.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { SesionIniciador } from '../components/sincronizacion/SesionIniciador';
import { SyncIniciador } from '../components/sincronizacion/SyncIniciador';
import { DATABASE_NAME, initDatabase } from '../db/database';
import { colors } from '../theme';

// La pantalla de carga (morada, con el icono) se queda visible hasta que las fuentes estén listas, en lugar de
// dar paso a una pantalla en blanco con un círculo girando. Se llama aquí, fuera de los componentes y sin esperar.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

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

  // Se oculta cuando las fuentes cargaron o fallaron (si fallan, la app sigue con la letra del sistema): nunca se queda puesta.
  useEffect(() => {
    if (fuentesListas) SplashScreen.hide();
  }, [fuentesListas]);

  if (!fuentesListas) {
    return <Loading />;
  }

  return (
    <Suspense fallback={<Loading />}>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={initDatabase} useSuspense>
        <StatusBar style="dark" />
        <SesionIniciador />
        <SyncIniciador />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="nuevo-nuevo-sector" options={{ presentation: 'modal' }} />
          <Stack.Screen name="nuevo-gasto" options={{ presentation: 'modal' }} />
          <Stack.Screen name="editar-ingreso" options={{ presentation: 'modal' }} />
          <Stack.Screen name="sincronizacion" options={{ presentation: 'modal' }} />
        </Stack>
      </SQLiteProvider>
    </Suspense>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});