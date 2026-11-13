import type { FormaDinero, Moneda, OrigenIngreso } from '../types';
import { formatMonto } from './formatters';
import { deCentavos, parseMontoCentavos } from './montos';

export interface EntradaIngreso {
  /** Texto del campo "monto". */
  montoTexto: string;
  forma: FormaDinero | null;
  origen: OrigenIngreso | null;
  /** Texto escrito en cada sector del reparto, por id de sector. Vacío = 0. */
  repartos: Record<string, string>;
}

export interface ErroresIngreso {
  monto?: string;
  forma?: string;
  origen?: string;
  reparto?: string;
}

export interface RepartoValido {
  sector_id: string;
  monto: number;
}

export interface ResultadoIngreso {
  valido: boolean;
  errores: ErroresIngreso;
  /** null si el monto está vacío o no es válido. */
  montoCentavos: number | null;
  repartidoCentavos: number;
  /**
   * Lo que falta por repartir, en centavos:
   * positivo = falta, 0 = todo repartido, negativo = te pasaste. null si no hay monto válido.
   */
  faltaCentavos: number | null;
  /** Solo los sectores con monto mayor que cero, listos para guardar. */
  repartos: RepartoValido[];
}

/**
 * Valida el formulario de ingreso: monto, forma, origen y que la suma del reparto
 * sea EXACTAMENTE igual al monto. `sectores` son los sectores donde se puede repartir.
 */
export function validarIngreso(
  entrada: EntradaIngreso,
  sectores: { id: string }[],
): ResultadoIngreso {
  const errores: ErroresIngreso = {};
  const moneda: Moneda = entrada.forma === 'usd' ? 'USD' : 'CUP';

  const montoCrudo = parseMontoCentavos(entrada.montoTexto);
  const montoCentavos = montoCrudo !== null && montoCrudo > 0 ? montoCrudo : null;
  if (montoCentavos === null) {
    errores.monto =
      entrada.montoTexto.trim() === '' || montoCrudo === null
        ? 'Escribe el monto del ingreso.'
        : 'El monto debe ser mayor que cero.';
  }

  if (entrada.forma === null) errores.forma = 'Elige la forma de dinero.';
  if (entrada.origen === null) errores.origen = 'Elige el origen del ingreso.';

  const repartos: RepartoValido[] = [];
  let repartidoCentavos = 0;
  for (const sector of sectores) {
    const centavos = parseMontoCentavos(entrada.repartos[sector.id] ?? '') ?? 0;
    if (centavos > 0) {
      repartidoCentavos += centavos;
      repartos.push({ sector_id: sector.id, monto: deCentavos(centavos) });
    }
  }

  const faltaCentavos = montoCentavos === null ? null : montoCentavos - repartidoCentavos;
  if (faltaCentavos !== null && faltaCentavos > 0) {
    errores.reparto = `Faltan ${formatMonto(deCentavos(faltaCentavos), moneda)} por repartir.`;
  } else if (faltaCentavos !== null && faltaCentavos < 0) {
    errores.reparto = `Te pasaste por ${formatMonto(deCentavos(-faltaCentavos), moneda)}. Reduce algún sector.`;
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
    montoCentavos,
    repartidoCentavos,
    faltaCentavos,
    repartos,
  };
}