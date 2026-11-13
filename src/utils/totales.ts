import type { FormaDinero } from '../types';
import { aCentavos, deCentavos } from './montos';

export type TotalesPorForma = Record<FormaDinero, number>;

/** Suma los montos de una lista separándolos por forma de dinero (se suma en centavos, sin errores de decimales). */
export function totalesPorForma(items: { forma: FormaDinero; monto: number }[]): TotalesPorForma {
  const centavos: Record<FormaDinero, number> = { efectivo: 0, transferencia: 0, usd: 0 };
  for (const item of items) {
    centavos[item.forma] += aCentavos(item.monto);
  }
  return {
    efectivo: deCentavos(centavos.efectivo),
    transferencia: deCentavos(centavos.transferencia),
    usd: deCentavos(centavos.usd),
  };
}