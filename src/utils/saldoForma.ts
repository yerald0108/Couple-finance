import type { FormaDinero } from '../types';
import { FORMA_LABEL } from './constants';
import { monedaDeForma } from './etiquetas';
import { formatMonto } from './formatters';
import { deCentavos } from './montos';

/**
 * Regla de saldo: el dinero de cada forma (efectivo, transferencia, USD) se puede gastar mientras alcance.
 * Un cambio solo se rechaza si deja un saldo en negativo Y lo empeora. Así, si algún dato viejo ya
 * estaba en negativo, no bloquea cambios que lo mejoran o lo dejan igual.
 */
export function empeoraNegativo(antesCentavos: number, despuesCentavos: number): boolean {
  return despuesCentavos < 0 && despuesCentavos < antesCentavos;
}

export interface DatosBloqueoGasto {
  montoCentavos: number;
  forma: FormaDinero;
  sectorNombre: string;
  /** Saldo actual de la cuenta de esa forma de dinero. */
  cuentaCentavos: number;
  /** Lo que el sector tiene ahora en esa misma forma de dinero. */
  sectorCentavos: number;
  /** Al editar un gasto: lo que ya había descontado en esa MISMA forma (vuelve antes de comparar). */
  devueltoCentavos?: number;
}

/** Lo máximo que se puede gastar en esa forma (lo menor entre la cuenta y el sector). Puede ser 0 o negativo. */
export function disponibleParaGastar(d: {
  cuentaCentavos: number;
  sectorCentavos: number;
  devueltoCentavos?: number;
}): number {
  const devuelto = d.devueltoCentavos ?? 0;
  return Math.min(d.cuentaCentavos + devuelto, d.sectorCentavos + devuelto);
}

/**
 * Motivos por los que NO se puede guardar un gasto en esa forma de dinero. Lista vacía = se puede.
 * Se comprueba la cuenta de esa forma y lo que el sector tiene en esa forma.
 */
export function bloqueosGasto(d: DatosBloqueoGasto): string[] {
  const devuelto = d.devueltoCentavos ?? 0;
  const moneda = monedaDeForma(d.forma);
  const etiqueta = FORMA_LABEL[d.forma];
  const motivos: string[] = [];

  const cuentaDisponible = d.cuentaCentavos + devuelto;
  if (empeoraNegativo(d.cuentaCentavos, cuentaDisponible - d.montoCentavos)) {
    motivos.push(
      cuentaDisponible <= 0
        ? `No tienes dinero en ${etiqueta}: está agotado.`
        : `No tienes suficiente en ${etiqueta}: solo hay ${formatMonto(deCentavos(cuentaDisponible), moneda)}.`,
    );
  }

  const sectorDisponible = d.sectorCentavos + devuelto;
  if (empeoraNegativo(d.sectorCentavos, sectorDisponible - d.montoCentavos)) {
    motivos.push(
      sectorDisponible <= 0
        ? `${d.sectorNombre} no tiene dinero en ${etiqueta}: está agotado.`
        : `${d.sectorNombre} no tiene suficiente en ${etiqueta}: solo hay ${formatMonto(deCentavos(sectorDisponible), moneda)}.`,
    );
  }

  return motivos;
}