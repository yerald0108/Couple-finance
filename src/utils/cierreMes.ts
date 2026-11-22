import type { TipoSector } from '../types';
import type {
  AnalisisPeriodo,
  BarraDestacada,
  ComparacionPeriodo,
  GastoTop,
  Insight,
  Montos,
  ResumenPeriodo,
} from './analisis';
import type { Estadisticas } from './estadisticas';
import { etiquetaMes } from './fechas';
import { formatMonto } from './formatters';
import { aCentavos, deCentavos } from './montos';

/**
 * Cierre de mes: el resumen de un mes ya terminado, pensado para mirarlo en pareja.
 *
 * Todo son funciones puras: reciben lo que ya calcula Estadísticas (`analizarPeriodo`) más el saldo de cada
 * sector al terminar el mes, y devuelven textos y números listos para mostrar. Así el cierre y Estadísticas
 * nunca dicen cosas distintas. Se calcula en centavos enteros; pesos y USD no se mezclan.
 */

// ---------------------------------------------------------------------------
// Claves de mes ("2026-10")
// ---------------------------------------------------------------------------

/** "2026-10" del mes (hora local) de una fecha. Sirve para pasar un mes por la ruta y para guardar el último visto. */
export function claveMes(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}

/** Año y mes (0 = enero) de una clave "2026-10". null si no es una clave válida. */
export function leerClaveMes(clave: string): { anio: number; mes: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(clave);
  if (!m) return null;
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  if (anio < 2000 || mes < 1 || mes > 12) return null;
  return { anio, mes: mes - 1 };
}

/** Clave del mes anterior al de `ahora` (el último mes que ya terminó). */
export function claveMesAnterior(ahora: Date): string {
  return claveMes(new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1));
}

/** Clave del mes que está `desplazamiento` meses del de `ahora` (-1 = el anterior). */
export function claveDeDesplazamiento(desplazamiento: number, ahora: Date): string {
  return claveMes(new Date(ahora.getFullYear(), ahora.getMonth() + desplazamiento, 1));
}

/**
 * Cuántos meses antes del actual está esa clave (-1 = el mes pasado). null si la clave no es válida o si es
 * el mes actual o uno futuro: un mes solo se cierra cuando termina.
 */
export function desplazamientoDeClave(clave: string, ahora: Date): number | null {
  const c = leerClaveMes(clave);
  if (!c) return null;
  const d = c.anio * 12 + c.mes - (ahora.getFullYear() * 12 + ahora.getMonth());
  return d <= -1 ? d : null;
}

/** "Octubre 2026". Cadena vacía si la clave no es válida. */
export function etiquetaDeClave(clave: string): string {
  const c = leerClaveMes(clave);
  return c ? etiquetaMes(new Date(c.anio, c.mes, 1)) : '';
}

/**
 * ¿Ya se vio el cierre del mes `claveAnterior`? `visto` es la última clave guardada en este teléfono.
 * Un valor ilegible o del futuro (por ejemplo, el reloj estuvo mal puesto) se ignora para no esconder los cierres.
 */
export function cierreYaVisto(visto: string | null, claveAnterior: string, ahora: Date): boolean {
  if (visto === null || leerClaveMes(visto) === null) return false;
  if (visto > claveMes(ahora)) return false;
  return visto >= claveAnterior;
}

// ---------------------------------------------------------------------------
// Sectores: ¿se pasó?
// ---------------------------------------------------------------------------

/**
 *  - `se_paso`: gastó más de lo que se le repartió ESTE mes (usó dinero que ya tenía de antes).
 *  - `sin_reparto`: no se le repartió nada este mes pero gastó.
 *  - `dentro`: gastó lo repartido o menos.
 */
export type EstadoSector = 'se_paso' | 'sin_reparto' | 'dentro';

type EstadoMoneda = EstadoSector | 'nada';

/** Lo repartido, lo gastado y lo que quedó al terminar el mes, en una moneda. */
export interface UsoMonedaCierre {
  repartido: number;
  gastado: number;
  /** Cuánto se pasó (0 si no se pasó). */
  exceso: number;
  /** Saldo del sector al terminar el mes (incluye lo que traía de meses anteriores). */
  saldoFinal: number;
}

/** Una frase de un sector; `mala` = hay que resaltarla en rojo (se pasó, terminó en negativo). */
export interface LineaSector {
  texto: string;
  mala?: boolean;
}

export interface SectorCierre {
  sector_id: string;
  nombre: string;
  tipo: TipoSector;
  color: string | null;
  estado: EstadoSector;
  cup: UsoMonedaCierre;
  usd: UsoMonedaCierre;
  /** Gastado sobre repartido en %, en pesos (o en USD si el sector solo tuvo USD). Puede pasar de 100. null si no hubo reparto. */
  porcentajeUsado: number | null;
  /** true si al terminar el mes el sector tenía saldo negativo (en pesos o en USD). */
  terminoEnNegativo: boolean;
  /** Frases ya escritas para mostrar, de la más importante a la menos. */
  lineas: LineaSector[];
}

function estadoMoneda(repartido: number, gastado: number): EstadoMoneda {
  const r = aCentavos(repartido);
  const g = aCentavos(gastado);
  if (r === 0 && g === 0) return 'nada';
  if (r > 0 && g > r) return 'se_paso';
  if (r === 0 && g > 0) return 'sin_reparto';
  return 'dentro';
}

function usoMoneda(repartido: number, gastado: number, saldoFinal: number): UsoMonedaCierre {
  const r = aCentavos(repartido);
  const g = aCentavos(gastado);
  return {
    repartido: deCentavos(r),
    gastado: deCentavos(g),
    exceso: r > 0 && g > r ? deCentavos(g - r) : 0,
    saldoFinal: deCentavos(aCentavos(saldoFinal)),
  };
}

function porcentajeDe(uso: UsoMonedaCierre): number | null {
  const r = aCentavos(uso.repartido);
  return r > 0 ? (aCentavos(uso.gastado) / r) * 100 : null;
}

/** Frases de un sector: lo gastado, el veredicto, el USD (si hubo) y lo que le quedó. */
function lineasDeSector(
  tipo: TipoSector,
  cup: UsoMonedaCierre,
  usd: UsoMonedaCierre,
  estadoCup: EstadoMoneda,
  estadoUsd: EstadoMoneda,
): LineaSector[] {
  const lineas: LineaSector[] = [];
  const ahorro = tipo === 'ahorro';
  const hayCup = estadoCup !== 'nada';
  const hayUsd = estadoUsd !== 'nada';

  if (hayCup) {
    lineas.push({
      texto: ahorro
        ? `Guardó ${formatMonto(cup.repartido)} y retiró ${formatMonto(cup.gastado)}.`
        : `Gastó ${formatMonto(cup.gastado)} de ${formatMonto(cup.repartido)} repartidos.`,
    });
  }

  // Veredicto: primero pesos, luego USD.
  if (estadoCup === 'se_paso') {
    lineas.push({
      texto: ahorro
        ? `Retiró ${formatMonto(cup.exceso)} más de lo que guardó este mes.`
        : `Se pasó ${formatMonto(cup.exceso)} del reparto de este mes: usó dinero que le quedaba de antes.`,
      mala: true,
    });
  } else if (estadoCup === 'sin_reparto') {
    lineas.push({
      texto: ahorro
        ? 'No guardó nada nuevo este mes y retiró de lo que ya tenía.'
        : 'No se le repartió dinero este mes: gastó de lo que ya tenía.',
    });
  } else if (estadoCup === 'dentro' && !ahorro) {
    const libre = deCentavos(aCentavos(cup.repartido) - aCentavos(cup.gastado));
    lineas.push({ texto: libre > 0 ? `Le sobraron ${formatMonto(libre)} del reparto.` : 'Gastó justo lo repartido.' });
  }

  if (hayUsd) {
    let usdTexto = `USD: ${ahorro ? 'guardó' : 'repartido'} ${formatMonto(usd.repartido, 'USD')}, ${
      ahorro ? 'retiró' : 'gastó'
    } ${formatMonto(usd.gastado, 'USD')}`;
    if (estadoUsd === 'se_paso') usdTexto += ` (se pasó ${formatMonto(usd.exceso, 'USD')})`;
    else if (estadoUsd === 'sin_reparto') usdTexto += ' (sin reparto este mes)';
    lineas.push({ texto: `${usdTexto}.`, mala: estadoUsd === 'se_paso' });
  }

  // Lo que quedó al terminar el mes.
  const quedaCup = cup.saldoFinal;
  const quedaUsd = usd.saldoFinal;
  if (quedaCup < 0 || quedaUsd < 0) {
    const partes: string[] = [];
    if (quedaCup < 0) partes.push(formatMonto(quedaCup));
    if (quedaUsd < 0) partes.push(formatMonto(quedaUsd, 'USD'));
    lineas.push({ texto: `Terminó el mes en negativo: ${partes.join(' y ')}.`, mala: true });
  } else {
    const partes = [formatMonto(quedaCup)];
    if (quedaUsd > 0) partes.push(formatMonto(quedaUsd, 'USD'));
    lineas.push({ texto: `Le quedó disponible: ${partes.join(' y ')}.` });
  }

  return lineas;
}

const ORDEN_ESTADO: Record<EstadoSector, number> = { se_paso: 0, sin_reparto: 1, dentro: 2 };

/** Un sector de `analisis.usoSectores` con su veredicto y lo que le quedó al terminar el mes. */
export function evaluarSectores(
  uso: AnalisisPeriodo['usoSectores'],
  saldosFinales: ReadonlyMap<string, Montos>,
): SectorCierre[] {
  const filas = uso.map((u, indice) => {
    const saldo = saldosFinales.get(u.sector_id) ?? { cup: 0, usd: 0 };
    const cup = usoMoneda(u.repartidoCup, u.gastadoCup, saldo.cup);
    const usd = usoMoneda(u.repartidoUsd, u.gastadoUsd, saldo.usd);
    const estadoCup = estadoMoneda(cup.repartido, cup.gastado);
    const estadoUsd = estadoMoneda(usd.repartido, usd.gastado);

    let estado: EstadoSector = 'dentro';
    if (estadoCup === 'se_paso' || estadoUsd === 'se_paso') estado = 'se_paso';
    else if (estadoCup === 'sin_reparto' || estadoUsd === 'sin_reparto') estado = 'sin_reparto';

    const sector: SectorCierre = {
      sector_id: u.sector_id,
      nombre: u.nombre,
      tipo: u.tipo,
      color: u.color,
      estado,
      cup,
      usd,
      porcentajeUsado: porcentajeDe(cup) ?? porcentajeDe(usd),
      terminoEnNegativo: aCentavos(cup.saldoFinal) < 0 || aCentavos(usd.saldoFinal) < 0,
      lineas: lineasDeSector(u.tipo, cup, usd, estadoCup, estadoUsd),
    };
    return { sector, indice };
  });

  // Los que se pasaron primero (el que más, arriba); el resto conserva el orden de Estadísticas.
  return filas
    .sort(
      (a, b) =>
        ORDEN_ESTADO[a.sector.estado] - ORDEN_ESTADO[b.sector.estado] ||
        aCentavos(b.sector.cup.exceso) - aCentavos(a.sector.cup.exceso) ||
        aCentavos(b.sector.usd.exceso) - aCentavos(a.sector.usd.exceso) ||
        a.indice - b.indice,
    )
    .map((f) => f.sector);
}

/** "Gustos", "Gustos y Ahorro", "Gustos, Ahorro y Ocio". */
function unirNombres(nombres: string[]): string {
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/** La frase que resume cuántos sectores se pasaron. Cadena vacía si no hay sectores que evaluar. */
export function resumenSectores(sectores: SectorCierre[]): string {
  if (sectores.length === 0) return '';
  const pasaron = sectores.filter((s) => s.estado === 'se_paso');
  if (pasaron.length === 0) return 'Ningún sector se pasó de lo que se le repartió este mes.';
  if (pasaron.length === 1) return `${pasaron[0].nombre} se pasó de lo que se le repartió este mes.`;
  return `${pasaron.length} sectores se pasaron de lo que se les repartió: ${unirNombres(pasaron.map((s) => s.nombre))}.`;
}

// ---------------------------------------------------------------------------
// Titular
// ---------------------------------------------------------------------------

export type TonoTitular = 'bien' | 'atencion' | 'mal';

export interface TitularCierre {
  tono: TonoTitular;
  texto: string;
}

/** La frase principal del cierre, según cómo quedó el balance en pesos. */
export function titularDeCierre(resumen: ResumenPeriodo): TitularCierre {
  const { ingresos, gastos, balance } = resumen;
  const ingCup = aCentavos(ingresos.cup);
  const gasCup = aCentavos(gastos.cup);
  const balCup = aCentavos(balance.cup);

  if (ingCup === 0 && gasCup === 0) {
    const usd = `entraron ${formatMonto(ingresos.usd, 'USD')} y salieron ${formatMonto(gastos.usd, 'USD')}`;
    return { tono: aCentavos(balance.usd) < 0 ? 'mal' : 'bien', texto: `Solo hubo movimientos en USD: ${usd}.` };
  }
  if (ingCup === 0) {
    return {
      tono: 'atencion',
      texto: `No entró dinero en pesos este mes. Los ${formatMonto(gastos.cup)} que salieron vinieron de lo que ya tenían.`,
    };
  }
  if (balCup < 0) {
    return {
      tono: 'mal',
      texto: `Salió ${formatMonto(-balance.cup)} más de lo que entró en pesos.`,
    };
  }
  if (balCup === 0) {
    return { tono: 'atencion', texto: `Entró y salió lo mismo en pesos: ${formatMonto(ingresos.cup)}.` };
  }
  return {
    tono: 'bien',
    texto: `Cerraron con ${formatMonto(balance.cup)} de más en pesos: entró ${formatMonto(ingresos.cup)} y salió ${formatMonto(gastos.cup)}.`,
  };
}

// ---------------------------------------------------------------------------
// Todo junto
// ---------------------------------------------------------------------------

export interface NumerosMes {
  cantidadGastos: number;
  /** Gasto promedio por transacción en pesos. null si no hubo. */
  promedioPorGasto: number | null;
  /** El día con más gasto en pesos. null si no hubo gastos en pesos. */
  diaMayorGasto: BarraDestacada | null;
  /** Días del mes sin gastos en pesos. */
  diasSinGasto: number | null;
}

export interface CierreMes {
  /** "2026-10" */
  clave: string;
  /** "Octubre 2026" */
  etiqueta: string;
  /** false si en ese mes no se registró nada (ni ingresos ni gastos). */
  hayMovimientos: boolean;
  resumen: ResumenPeriodo;
  titular: TitularCierre;
  sectores: SectorCierre[];
  /** Solo los que se pasaron. */
  seExcedieron: SectorCierre[];
  /** "Ningún sector se pasó…" / "Gustos se pasó…". Vacío si no hay sectores. */
  resumenSectores: string;
  /** null si no hubo nada ni este mes ni el anterior. */
  comparacion: ComparacionPeriodo | null;
  /** Con qué mes se compara ("Septiembre 2026"). */
  etiquetaAnterior: string;
  numeros: NumerosMes;
  /** Los 3 gastos más grandes en pesos. */
  topGastos: GastoTop[];
  /** Mensajes para comentar en pareja (los de Estadísticas, sin repetir lo que ya dice el titular). */
  puntos: Insight[];
  /** true si hay movimientos de meses anteriores (para activar la flecha "anterior"). */
  hayMesAnterior: boolean;
}

export const MAX_TOP_GASTOS_CIERRE = 3;

/** Estos mensajes de Estadísticas ya los dice el titular del cierre. */
const PUNTOS_REPETIDOS = new Set(['sobregiro_cup', 'sin_ingresos']);

/** Los mensajes de Estadísticas dicen "respecto a el mes anterior"; aquí se escribe bien. */
export function pulirTexto(texto: string): string {
  return texto.replace(/ respecto a el /g, ' respecto al ');
}

export interface EntradaCierre {
  clave: string;
  stats: Estadisticas;
  analisis: AnalisisPeriodo;
  etiquetaAnterior: string;
  /** Saldo de cada sector al terminar el mes. Un sector que no aparece tenía 0. */
  saldosFinales: ReadonlyMap<string, Montos>;
  hayMesAnterior: boolean;
}

export function construirCierre(e: EntradaCierre): CierreMes {
  const { analisis, stats } = e;
  const { resumen } = analisis;
  const sectores = evaluarSectores(analisis.usoSectores, e.saldosFinales);
  const hayIngresos = aCentavos(resumen.ingresos.cup) > 0 || aCentavos(resumen.ingresos.usd) > 0;

  return {
    clave: e.clave,
    etiqueta: etiquetaDeClave(e.clave),
    hayMovimientos: stats.cantidad > 0 || hayIngresos,
    resumen,
    titular: titularDeCierre(resumen),
    sectores,
    seExcedieron: sectores.filter((s) => s.estado === 'se_paso'),
    resumenSectores: resumenSectores(sectores),
    comparacion: analisis.comparacion,
    etiquetaAnterior: e.etiquetaAnterior,
    numeros: {
      cantidadGastos: stats.cantidad,
      promedioPorGasto: analisis.detalle.promedioPorTransaccionCup,
      diaMayorGasto: analisis.detalle.mayor,
      diasSinGasto: analisis.detalle.sinGasto,
    },
    topGastos: analisis.detalle.topGastos.slice(0, MAX_TOP_GASTOS_CIERRE),
    puntos: analisis.insights
      .filter((i) => !PUNTOS_REPETIDOS.has(i.id))
      .map((i) => ({ ...i, texto: pulirTexto(i.texto) })),
    hayMesAnterior: e.hayMesAnterior,
  };
}