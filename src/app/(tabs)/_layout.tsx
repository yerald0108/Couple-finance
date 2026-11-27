import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import { fontSizes, fonts, radius } from '../../theme';
import type { Colores } from '../../theme/temas';
import { useTema } from '../../theme/useTema';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(colors: Colores, active: IconName, inactive: IconName) {
  return ({ size, focused }: { size: number; focused: boolean }) => (
    <Ionicons
      name={focused ? active : inactive}
      size={size}
      color={focused ? colors.primaryText : colors.textMuted}
    />
  );
}

/** Barra de navegación inferior con las 4 pantallas de la app. */
export default function TabsLayout() {
  const { colors, shadows } = useTema();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Al escribir, la barra se oculta bajo el teclado (como en las ventanas de formulario) en vez de subir con él.
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primaryText,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: fonts.regular,
          fontSize: fontSizes.xs,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          paddingTop: 6,
          ...shadows.tabBar,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio', tabBarIcon: tabIcon(colors, 'home', 'home-outline') }}
      />
      <Tabs.Screen
        name="movimientos"
        options={{
          title: 'Movimientos',
          tabBarIcon: tabIcon(colors, 'swap-horizontal', 'swap-horizontal-outline'),
        }}
      />
      <Tabs.Screen
        name="estadisticas"
        options={{
          title: 'Estadísticas',
          tabBarIcon: tabIcon(colors, 'pie-chart', 'pie-chart-outline'),
        }}
      />
      <Tabs.Screen
        name="billetera"
        options={{ title: 'Billetera', tabBarIcon: tabIcon(colors, 'wallet', 'wallet-outline') }}
      />
    </Tabs>
  );
}