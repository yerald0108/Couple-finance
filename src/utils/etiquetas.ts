import type { FormaDinero, Moneda } from '../types';
import { ORIGENES } from './constants';

/** Texto para mostrar de un origen de ingreso ("salario" -> "Salario"). */
export function origenLabel(origen: string | null): string {
  return ORIGENES.find((o) => o.value === origen)?.label ?? 'Ingreso';
}

/** Efectivo y transferencia son pesos (CUP); USD es dólares. */
export function monedaDeForma(forma: FormaDinero): Moneda {
  return forma === 'usd' ? 'USD' : 'CUP';
}