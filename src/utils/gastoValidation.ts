import type { FormaDinero, TipoMovimiento, TipoSector } from '../types';
import { parseMontoCentavos } from './montos';

export const CONCEPTO_MIN = 2;
export const CONCEPTO_MAX = 40;
export const MOTIVO_MIN = 3;
export const MOTIVO_MAX = 60;

/** Largo permitido del texto: el concepto de un gasto o el motivo de una salida de ahorro. */
export function limitesTexto(esAhorro: boolean): { min: number; max: number } {
  return esAhorro ? { min: MOTIVO_MIN, max: MOTIVO_MAX } : { min: CONCEPTO_MIN, max: CONCEPTO_MAX };
}

/** Qué tipo de movimiento se guarda al gastar desde cada tipo de sector. */
export function tipoMovimientoDeSector(tipo: TipoSector): TipoMovimiento {
  switch (tipo) {
    case 'gastos_fijos':
      return 'gasto_fijo';
    case 'gustos':
      return 'gusto';
    case 'ahorro':
      return 'ahorro';
    case 'personalizado':
      return 'gasto';
    default:
      throw new Error('En el sector Ingresos no se registran gastos.');
  }
}

export interface EntradaGasto {
  montoTexto: string;
  forma: FormaDinero | null;
  /** Concepto del gasto (arroz, jabón…) o, en Ahorro, el motivo de la salida. */
  texto: string;
  esAhorro: boolean;
}

export interface ErroresGasto {
  monto?: string;
  forma?: string;
  texto?: string;
}

export interface ResultadoValidacionGasto {
  valido: boolean;
  errores: ErroresGasto;
  /** null si el monto está vacío o no es válido. */
  montoCentavos: number | null;
  /** El texto ya limpio (sin espacios de más). */
  texto: string;
}

/** Valida el formulario de gasto (o de salida de ahorro). */
export function validarGasto(entrada: EntradaGasto): ResultadoValidacionGasto {
  const errores: ErroresGasto = {};

  const montoCrudo = parseMontoCentavos(entrada.montoTexto);
  const montoCentavos = montoCrudo !== null && montoCrudo > 0 ? montoCrudo : null;
  if (montoCentavos === null) {
    errores.monto =
      entrada.montoTexto.trim() === '' || montoCrudo === null
        ? 'Escribe el monto.'
        : 'El monto debe ser mayor que cero.';
  }

  if (entrada.forma === null) errores.forma = 'Elige la forma de dinero.';

  const texto = entrada.texto.trim().replace(/\s+/g, ' ');
  const { min, max } = limitesTexto(entrada.esAhorro);
  const nombre = entrada.esAhorro ? 'El motivo' : 'El concepto';
  if (texto.length === 0) {
    errores.texto = entrada.esAhorro
      ? 'Escribe el motivo de la salida (ej. emergencia).'
      : 'Escribe en qué gastaste (ej. arroz, jabón).';
  } else if (texto.length < min) {
    errores.texto = `${nombre} es muy corto (mínimo ${min} letras).`;
  } else if (texto.length > max) {
    errores.texto = `${nombre} es muy largo (máximo ${max} letras).`;
  }

  return { valido: Object.keys(errores).length === 0, errores, montoCentavos, texto };
}