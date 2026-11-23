import { Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { useFonts } from 'expo-font';
// Cada peso se importa de su propia carpeta: importar del paquete raíz mete en la app las 18 fuentes de Inter
// (unos 6 MB), aunque solo se usen tres.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { SesionIniciador } from '../components/sincronizacion/SesionIniciador';
import { SyncIniciador } from '../components/sincronizacion/SyncIniciador';
import { DATABASE_NAME, initDatabase } from '../db/database';
import { colors } from '../theme';

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

  if (!fontsLoaded && !fontError) {
    return <Loading />;
  }

  return (
    <Suspense fallback={<Loading />}>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={initDatabase} useSuspense>
        <StatusBar style="dark" />
        <SesionIniciador />
        <SyncIniciador />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="nuevo-sector" options={{ presentation: 'modal' }} />
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