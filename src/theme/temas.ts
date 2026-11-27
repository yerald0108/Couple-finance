/**
 * Las dos paletas de la app (clara y oscura) y las sombras de cada una.
 * Aquí solo hay datos: cada componente los pide con `useTema()` / `useEstilos()` (ver `useTema.ts`).
 */

/** Los colores que cambian de un modo al otro. Los dos modos tienen exactamente los mismos nombres. */
export interface Colores {
  // Marca
  /** Relleno de la marca (botones, tarjetas de resumen). Lleva texto `onPrimary` encima. */
  primary: string;
  primaryDark: string;
  /** Fondo suave de chips y acciones secundarias. Lleva texto `primaryText` encima. */
  primarySoft: string;
  /** El color de la marca cuando se usa como texto o icono sobre `surface`, `background` o `primarySoft`. */
  primaryText: string;
  /** Texto e iconos sobre un relleno `primary`. */
  onPrimary: string;
  // Degradado de la tarjeta de saldo
  gradientStart: string;
  gradientEnd: string;

  // Superficies
  background: string;
  surface: string;
  border: string;

  // Texto
  text: string;
  textSecondary: string;
  textMuted: string;

  // Estados
  positive: string;
  negative: string;
  /** Texto sobre un relleno `negative` (la insignia de la campana). */
  onNegative: string;
  warning: string;
}

export const coloresClaros: Colores = {
  primary: '#5B4DF5',
  primaryDark: '#4338CA',
  primarySoft: '#ECEBFE',
  primaryText: '#5B4DF5',
  onPrimary: '#FFFFFF',
  gradientStart: '#8B7CF6',
  gradientEnd: '#5B8DEF',

  background: '#F4F5FB',
  surface: '#FFFFFF',
  border: '#E8EAF3',

  text: '#1B1D2E',
  textSecondary: '#6B7088',
  textMuted: '#9A9FB5',

  positive: '#16A34A',
  negative: '#DC2626',
  onNegative: '#FFFFFF',
  warning: '#F59E0B',
};

export const coloresOscuros: Colores = {
  // El relleno de la marca no cambia: las tarjetas de resumen se ven igual y el texto blanco sigue leyéndose (5.5:1).
  primary: '#5B4DF5',
  // La variante "más fuerte" de la marca: en claro es más oscura que `primary`, en oscuro es más clara (resalta más sobre el fondo).
  primaryDark: '#C4BEFF',
  primarySoft: '#2A2754',
  // Lo que en claro era el índigo de la marca como texto se aclara para leerse sobre fondo oscuro.
  primaryText: '#A59CFF',
  onPrimary: '#FFFFFF',
  gradientStart: '#6D5FE8',
  gradientEnd: '#3F73D9',

  background: '#0F1020',
  surface: '#1A1C2E',
  border: '#2E3150',

  text: '#ECEEF8',
  textSecondary: '#A7ACC6',
  textMuted: '#8085A0',

  positive: '#4ADE80',
  negative: '#F87171',
  onNegative: '#1B1D2E',
  warning: '#FBBF24',
};

/** Sombras de las tarjetas y de la barra inferior (iOS usa shadow*, Android usa elevation). */
export interface Sombras {
  card: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  tabBar: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
}

const sombrasClaras: Sombras = {
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
};

/** Sobre fondo oscuro una sombra no se ve: las tarjetas se distinguen por su tono (surface sobre background). */
const sombrasOscuras: Sombras = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  tabBar: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};

export type Esquema = 'claro' | 'oscuro';

/** Todo lo que cambia con el modo. Hay solo dos objetos (`temaClaro` y `temaOscuro`), siempre los mismos. */
export interface Tema {
  esquema: Esquema;
  colors: Colores;
  shadows: Sombras;
}

export const temaClaro: Tema = { esquema: 'claro', colors: coloresClaros, shadows: sombrasClaras };
export const temaOscuro: Tema = { esquema: 'oscuro', colors: coloresOscuros, shadows: sombrasOscuras };

export function temaDe(esquema: Esquema): Tema {
  return esquema === 'oscuro' ? temaOscuro : temaClaro;
}

/** El modo que elige la persona: uno fijo, o el del teléfono. */
export type ModoTema = 'claro' | 'oscuro' | 'automatico';

export const MODOS_TEMA: ModoTema[] = ['claro', 'oscuro', 'automatico'];

export function esModoTema(valor: unknown): valor is ModoTema {
  return valor === 'claro' || valor === 'oscuro' || valor === 'automatico';
}

/** El esquema que se ve: el elegido, o el del teléfono si el modo es automático (sin dato del teléfono, claro). */
export function esquemaEfectivo(modo: ModoTema, sistemaOscuro: boolean): Esquema {
  if (modo === 'automatico') return sistemaOscuro ? 'oscuro' : 'claro';
  return modo;
}