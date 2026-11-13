import type { Cuenta } from '../db/schema';
import { redondear } from './formatters';

export interface ResumenSaldos {
  efectivo: number;
  transferencia: number;
  usd: number;
  /** Efectivo + transferencia, en pesos. El USD NO se suma aquí: se muestra aparte. */
  totalCup: number;
}

/** Calcula los saldos por forma de dinero y el total en pesos a partir de las cuentas. */
export function resumenSaldos(cuentas: Cuenta[]): ResumenSaldos {
  const saldoDe = (tipo: Cuenta['tipo']) =>
    redondear(
      cuentas.filter((c) => c.tipo === tipo).reduce((suma, c) => suma + c.saldo, 0),
    );

  const efectivo = saldoDe('efectivo');
  const transferencia = saldoDe('transferencia');
  const usd = saldoDe('usd');

  return { efectivo, transferencia, usd, totalCup: redondear(efectivo + transferencia) };
}