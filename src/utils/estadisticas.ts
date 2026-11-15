import type { FormaDinero, TipoSector } from '../types';
import { claveDia, diasEntre } from './fechas';
import { aCentavos, deCentavos } from './montos';
import type { TotalesPorForma } from './totales';

/** Un gasto tal como llega de la base de datos, con los datos de su sector. */
export interface GastoEstadistica {
  sector_id: string;
  sector_nombre: string;
  sector_tipo: TipoSector;
  /** Color propio del sector (solo los personalizados lo tienen). */
  sector_color: string | null;
  forma: FormaDinero;
  monto: number;
  /** ISO UTC. */
  fecha: string;
  /** Concepto del gasto (arroz, jabón…). null en las salidas de ahorro. */
  concepto?: string | null;
  /** Motivo de una salida de ahorro. */
  motivo_ahorro?: string | null;
}

export interface FilaSector {
  sector_id: string;
  nombre: string;
  tipo: TipoSector;
  color: string | null;
  /** Gastado en pesos (efectivo + transferencia). */
  cup: number;
  /** Gastado en USD (aparte). */
  usd: number;
  /** Parte de los gastos en pesos (0–100). 0 si el sector solo gastó USD. */
  porcentaje: number;
}

export interface FilaDia {
  /** "2026-11-13" */
  clave: string;
  /** Día del mes (1–31). */
  dia: number;
  /** 0 = lunes … 6 = domingo. */
  diaSemana: number;
  cup: number;
  usd: number;
}

export interface Estadisticas {
  /** Total gastado en pesos (efectivo + transferencia). */
  totalCup: number;
  /** Total gastado en USD (aparte, nunca se suma a los pesos). */
  totalUsd: number;
  /** Cantidad de gastos. */
  cantidad: number;
  porForma: TotalesPorForma;
  /** Parte de efectivo y de transferencia sobre el total en pesos (0–100). */
  porcentajeForma: { efectivo: number; transferencia: number };
  /** Sectores con gasto en el período, del que más gastó al que menos. */
  porSector: FilaSector[];
  /** Todos los días del período (los que no tuvieron gastos salen en 0). */
  porDia: FilaDia[];
}

/** Parte sobre total en porcentaje (0–100). Si no hay total, 0. */
export function porcentaje(parteCentavos: number, totalCentavos: number): number {
  if (totalCentavos <= 0) return 0;
  return (parteCentavos / totalCentavos) * 100;
}

/**
 * Suma los gastos de un período por forma de dinero, por sector y por día.
 * Todo se calcula en centavos enteros para que nunca haya errores de decimales.
 * Pesos y USD NUNCA se mezclan: van en columnas separadas.
 *
 * `inicio` y `fin` (hora local) definen los días que se listan en `porDia`.
 */
export function agregarGastos(gastos: GastoEstadistica[], inicio: Date, fin: Date): Estadisticas {
  const porForma = { efectivo: 0, transferencia: 0, usd: 0 };
  const sectores = new Map<string, { fila: Omit<FilaSector, 'cup' | 'usd' | 'porcentaje'>; cup: number; usd: number }>();

  const dias = diasEntre(inicio, fin);
  const porDia = new Map<string, { cup: number; usd: number }>();
  for (const d of dias) porDia.set(claveDia(d), { cup: 0, usd: 0 });

  for (const g of gastos) {
    const centavos = aCentavos(g.monto);
    porForma[g.forma] += centavos;

    let s = sectores.get(g.sector_id);
    if (!s) {
      s = {
        fila: { sector_id: g.sector_id, nombre: g.sector_nombre, tipo: g.sector_tipo, color: g.sector_color },
        cup: 0,
        usd: 0,
      };
      sectores.set(g.sector_id, s);
    }

    const fecha = new Date(g.fecha);
    const dia = Number.isNaN(fecha.getTime()) ? undefined : porDia.get(claveDia(fecha));

    if (g.forma === 'usd') {
      s.usd += centavos;
      if (dia) dia.usd += centavos;
    } else {
      s.cup += centavos;
      if (dia) dia.cup += centavos;
    }
  }

  const totalCup = porForma.efectivo + porForma.transferencia;
  const totalUsd = porForma.usd;

  const porSector: FilaSector[] = [...sectores.values()]
    .map((s) => ({
      ...s.fila,
      cup: deCentavos(s.cup),
      usd: deCentavos(s.usd),
      porcentaje: porcentaje(s.cup, totalCup),
      _cup: s.cup,
      _usd: s.usd,
    }))
    .sort((a, b) => b._cup - a._cup || b._usd - a._usd || a.nombre.localeCompare(b.nombre))
    .map(({ _cup, _usd, ...fila }) => fila);

  return {
    totalCup: deCentavos(totalCup),
    totalUsd: deCentavos(totalUsd),
    cantidad: gastos.length,
    porForma: {
      efectivo: deCentavos(porForma.efectivo),
      transferencia: deCentavos(porForma.transferencia),
      usd: deCentavos(porForma.usd),
    },
    porcentajeForma: {
      efectivo: porcentaje(porForma.efectivo, totalCup),
      transferencia: porcentaje(porForma.transferencia, totalCup),
    },
    porSector,
    porDia: dias.map((d) => {
      const suma = porDia.get(claveDia(d)) ?? { cup: 0, usd: 0 };
      return {
        clave: claveDia(d),
        dia: d.getDate(),
        diaSemana: (d.getDay() + 6) % 7,
        cup: deCentavos(suma.cup),
        usd: deCentavos(suma.usd),
      };
    }),
  };
}