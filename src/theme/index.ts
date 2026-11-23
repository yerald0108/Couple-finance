/**
 * Tema visual de la app.
 * Inspirado en un estilo "fintech" limpio: fondo gris muy claro, tarjetas blancas
 * con esquinas redondeadas, color principal índigo/violeta y colores vivos por categoría.
 */
import type { FormaDinero, TipoSector } from '../types';

export const colors = {
  // Marca
  primary: '#5B4DF5',
  primaryDark: '#4338CA',
  primarySoft: '#ECEBFE',
  // Degradado de la tarjeta de saldo (se usará en la Fase 4)
  gradientStart: '#8B7CF6',
  gradientEnd: '#5B8DEF',

  // Superficies
  background: '#F4F5FB',
  surface: '#FFFFFF',
  border: '#E8EAF3',

  // Texto
  text: '#1B1D2E',
  textSecondary: '#6B7088',
  textMuted: '#9A9FB5',

  // Estados
  positive: '#16A34A',
  negative: '#DC2626',
  warning: '#F59E0B',
} as const;

/** Color de cada forma de dinero (cuentas). */
export const formaColors: Record<FormaDinero, string> = {
  efectivo: '#22C55E',
  transferencia: '#3B82F6',
  usd: '#8B5CF6',
};

/** Color de cada sector base. Los sectores personalizados guardan su propio color en la BD. */
export const sectorColors: Record<TipoSector, string> = {
  ingresos: '#16A34A',
  gastos_fijos: '#3B82F6',
  gustos: '#A855F7',
  ahorro: '#F59E0B',
  personalizado: '#64748B',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Nombres de las fuentes Inter cargadas en el layout raíz. */
export const fonts = {
  regular: 'Inter_400Regular',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
} as const;

/** Sombras suaves para tarjetas (iOS usa shadow*, Android usa elevation). */
export const shadows = {
  card: {
    shadowColor: '#1B1D2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  tabBar: {
    shadowColor: '#1B1D2E',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
  },
} as const;