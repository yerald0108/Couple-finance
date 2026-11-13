import type { FormaDinero, OrigenIngreso } from '../types';

/**
 * Paleta para los sectores que crea el usuario. Cada sector nuevo toma el siguiente
 * color de la lista (y vuelve a empezar al terminarla). Son distintos de los 4 sectores base.
 */
export const PALETA_SECTORES = [
  '#06B6D4',
  '#EC4899',
  '#14B8A6',
  '#EF4444',
  '#84CC16',
  '#6366F1',
  '#0EA5E9',
  '#D946EF',
] as const;

/** Nombre de cada forma de dinero para mostrar en pantalla. */
export const FORMA_LABEL: Record<FormaDinero, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  usd: 'USD',
};

/** Orígenes posibles de un ingreso, en el orden en que se muestran. */
export const ORIGENES: { value: OrigenIngreso; label: string }[] = [
  { value: 'salario', label: 'Salario' },
  { value: 'ganancia', label: 'Ganancia' },
  { value: 'prestamo', label: 'Préstamo' },
  { value: 'otro', label: 'Otro' },
];