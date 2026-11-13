import type { Moneda } from '../types';

/** Redondea a 2 decimales (centavos). Evita errores como 0.1 + 0.2 = 0.30000000000000004. */
export function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/** Símbolo de cada moneda: pesos "$", dólares "US$". */
export function simboloMoneda(moneda: Moneda = 'CUP'): string {
  return moneda === 'USD' ? 'US$' : '$';
}

/**
 * Formatea un monto para mostrarlo: CUP -> "$1,234.50", USD -> "US$12.00".
 * Se hace a mano (sin Intl) para que se vea igual en todos los teléfonos.
 */
export function formatMonto(valor: number, moneda: Moneda = 'CUP'): string {
  const v = redondear(valor);
  const [entero, decimales] = Math.abs(v).toFixed(2).split('.');
  const conMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${v < 0 ? '-' : ''}${simboloMoneda(moneda)}${conMiles}.${decimales}`;
}