import { Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { SesionIniciador } from '../components/sincronizacion/SesionIniciador';
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
    Inter_500Medium,
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