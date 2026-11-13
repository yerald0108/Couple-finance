import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { colors, fontSizes, fonts, radius, shadows } from '../../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(active: IconName, inactive: IconName) {
  return ({ size, focused }: { size: number; focused: boolean }) => (
    <Ionicons
      name={focused ? active : inactive}
      size={size}
      color={focused ? colors.primary : colors.textMuted}
    />
  );
}

/** Barra de navegación inferior con las 4 pantallas de la app. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: fonts.medium,
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
        options={{ title: 'Inicio', tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="movimientos"
        options={{
          title: 'Movimientos',
          tabBarIcon: tabIcon('swap-horizontal', 'swap-horizontal-outline'),
        }}
      />
      <Tabs.Screen
        name="estadisticas"
        options={{
          title: 'Estadísticas',
          tabBarIcon: tabIcon('pie-chart', 'pie-chart-outline'),
        }}
      />
      <Tabs.Screen
        name="billetera"
        options={{ title: 'Billetera', tabBarIcon: tabIcon('wallet', 'wallet-outline') }}
      />
    </Tabs>
  );
}