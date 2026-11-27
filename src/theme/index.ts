/**
 * Tema visual de la app.
 * Inspirado en un estilo "fintech" limpio: fondo gris muy claro, tarjetas blancas
 * con esquinas redondeadas, color principal índigo/violeta y colores vivos por categoría.
 *
 * Aquí quedan los valores que no cambian con el modo claro/oscuro. Los colores y las sombras, que sí cambian,
 * están en `temas.ts` y se piden con `useTema()` / `useEstilos()` (`useTema.ts`).
 */
import type { FormaDinero, TipoSector } from '../types';

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