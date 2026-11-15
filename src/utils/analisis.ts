import type { FormaDinero, TipoSector } from '../types';
import { agregarGastos, porcentaje, type Estadisticas, type GastoEstadistica } from './estadisticas';
import {
  claveDia,
  diasEntre,
  etiquetaDia,
  etiquetaMes,
  mesCorto,
  type Periodo,
} from './fechas';
import { formatMonto } from './formatters';
import { aCentavos, deCentavos } from './montos';

/**
 * Análisis del período para la pantalla Estadísticas. Todo son funciones puras: reciben los datos ya
 * leídos de la base y devuelven números listos para mostrar. Se calcula en centavos enteros y pesos
 * (efectivo + transferencia) y USD NUNCA se mezclan.
 */

/** Pesos y USD por separado. */
export interface Montos {
  cup: number;
  usd: number;
}

/** Lo repartido a un sector en el período, por moneda. */
export interface RepartoPeriodo {
  sector_id: string;
  sector_nombre: string;
  sector_tipo: TipoSector;
  sector_color: string | null;
  cup: number;
  usd: number;
}

// ---------------------------------------------------------------------------
// Resumen
// ---------------------------------------------------------------------------

export interface ResumenPeriodo {
  ingresos: Montos;
  gastos: Montos;
  /** Ingresos menos gastos (puede ser negativo). */
  balance: Montos;
  /** Gastos en pesos sobre ingresos en pesos, en % (puede pasar de 100). null si no hubo ingresos en pesos. */
  porcentajeGastado: number | null;
}

export function resumirPeriodo(ingresos: Montos, gastos: Montos): ResumenPeriodo {
  const ingCup = aCentavos(ingresos.cup);
  const ingUsd = aCentavos(ingresos.usd);
  const gasCup = aCentavos(gastos.cup);
  const gasUsd = aCentavos(gastos.usd);
  return {
    ingresos: { cup: deCentavos(ingCup), usd: deCentavos(ingUsd) },
    gastos: { cup: deCentavos(gasCup), usd: deCentavos(gasUsd) },
    balance: { cup: deCentavos(ingCup - gasCup), usd: deCentavos(ingUsd - gasUsd) },
    porcentajeGastado: ingCup > 0 ? porcentaje(gasCup, ingCup) : null,
  };
}

// ---------------------------------------------------------------------------
// Comparación con el período anterior
// ---------------------------------------------------------------------------

export type Tendencia = 'sube' | 'baja' | 'igual' | 'nuevo' | 'sin_datos';

export interface Variacion {
  actual: number;
  anterior: number;
  /** Cambio en % respecto al anterior. null si el anterior fue 0. */
  cambio: number | null;
  tendencia: Tendencia;
}

/** Compara dos montos. 'nuevo' = antes no había nada y ahora sí; 'sin_datos' = ninguno de los dos tiene nada. */
export function calcularVariacion(actual: number, anterior: number): Variacion {
  const act = aCentavos(actual);
  const ant = aCentavos(anterior);
  const base = { actual: deCentavos(act), anterior: deCentavos(ant) };

  if (act === 0 && ant === 0) return { ...base, cambio: null, tendencia: 'sin_datos' };
  if (ant === 0) return { ...base, cambio: null, tendencia: 'nuevo' };

  const cambio = ((act - ant) / ant) * 100;
  const tendencia: Tendencia = Math.abs(cambio) < 0.5 ? 'igual' : cambio > 0 ? 'sube' : 'baja';
  return { ...base, cambio, tendencia };
}

export interface ComparacionPeriodo {
  gastosCup: Variacion;
  ingresosCup: Variacion;
  gastosUsd: Variacion;
  ingresosUsd: Variacion;
}

/** Nombre del período anterior para frases ("el mes anterior"). */
export function nombrePeriodoAnterior(periodo: Periodo): string {
  switch (periodo) {
    case 'dia':
      return 'el día anterior';
    case 'semana':
      return 'la semana anterior';
    case 'mes':
      return 'el mes anterior';
    default:
      return 'el año anterior';
  }
}

// ---------------------------------------------------------------------------
// Evolución (barras por día, o por mes en el año)
// ---------------------------------------------------------------------------

export interface BarraEvolucion {
  clave: string;
  /** Texto corto bajo la barra ("L", "12", "ene"); vacío si no se escribe. */
  etiqueta: string;
  /** Texto completo ("Lunes 9 nov", "Noviembre 2026"). */
  etiquetaLarga: string;
  cup: number;
  usd: number;
  /** true = ese día o mes todavía no llega. */
  futura: boolean;
}

export interface Evolucion {
  tipo: 'dia' | 'mes';
  barras: BarraEvolucion[];
  /** Mayor gasto en pesos de una barra. */
  maximoCup: number;
  /** Promedio en pesos por barra que ya empezó. */
  promedioCup: number;
  /** Posición de la barra más alta (-1 si no hubo gastos en pesos). */
  indiceMaximo: number;
}

const INICIALES_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Gasto por día (semana y mes) o por mes (año). Para el período "día" no hay evolución. */
export function calcularEvolucion(
  periodo: Periodo,
  gastos: GastoEstadistica[],
  inicio: Date,
  fin: Date,
  ahora: Date,
): Evolucion | null {
  if (periodo === 'dia') return null;

  const porMeses = periodo === 'anio';
  const claveDe = (f: Date) => (porMeses ? `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}` : claveDia(f));

  // Cada barra con su inicio: los días, o el primer día de cada mes.
  const inicios: Date[] = porMeses
    ? Array.from({ length: 12 }, (_, i) => new Date(inicio.getFullYear(), i, 1))
    : diasEntre(inicio, fin);

  const sumas = new Map<string, { cup: number; usd: number }>();
  for (const d of inicios) sumas.set(claveDe(d), { cup: 0, usd: 0 });

  for (const g of gastos) {
    const fecha = new Date(g.fecha);
    if (Number.isNaN(fecha.getTime())) continue;
    const suma = sumas.get(claveDe(fecha));
    if (!suma) continue;
    const centavos = aCentavos(g.monto);
    if (g.forma === 'usd') suma.usd += centavos;
    else suma.cup += centavos;
  }

  const barras: BarraEvolucion[] = inicios.map((d) => {
    const suma = sumas.get(claveDe(d)) ?? { cup: 0, usd: 0 };
    let etiqueta: string;
    if (porMeses) etiqueta = mesCorto(d);
    else if (periodo === 'semana') etiqueta = INICIALES_SEMANA[(d.getDay() + 6) % 7];
    else etiqueta = d.getDate() === 1 || d.getDate() % 5 === 0 ? String(d.getDate()) : '';
    return {
      clave: claveDe(d),
      etiqueta,
      etiquetaLarga: porMeses ? etiquetaMes(d) : etiquetaDia(d),
      cup: deCentavos(suma.cup),
      usd: deCentavos(suma.usd),
      futura: d.getTime() > ahora.getTime(),
    };
  });

  let maximo = 0;
  let indiceMaximo = -1;
  let totalCentavos = 0;
  let transcurridas = 0;
  barras.forEach((b, i) => {
    const c = aCentavos(b.cup);
    if (c > maximo) {
      maximo = c;
      indiceMaximo = i;
    }
    if (!b.futura) {
      totalCentavos += c;
      transcurridas += 1;
    }
  });

  return {
    tipo: porMeses ? 'mes' : 'dia',
    barras,
    maximoCup: deCentavos(maximo),
    promedioCup: transcurridas > 0 ? deCentavos(Math.round(totalCentavos / transcurridas)) : 0,
    indiceMaximo,
  };
}

// ---------------------------------------------------------------------------
// Detalle de gastos (extremos, ranking, conceptos)
// ---------------------------------------------------------------------------

export interface GastoTop {
  texto: string;
  sector: string;
  monto: number;
  forma: FormaDinero;
  /** ISO UTC. */
  fecha: string;
}

export interface ConceptoTop {
  concepto: string;
  veces: number;
  cup: number;
}

export interface BarraDestacada {
  etiqueta: string;
  cup: number;
}

export interface DetalleGastos {
  transaccionesCup: number;
  transaccionesUsd: number;
  /** Gasto promedio por transacción en pesos. null si no hubo. */
  promedioPorTransaccionCup: number | null;
  /** Días (o meses, en el año) con más y con menos gasto en pesos. null en el período "día". */
  mayor: BarraDestacada | null;
  menor: BarraDestacada | null;
  /** Cuántos días (o meses) que ya empezaron no tuvieron gastos en pesos. null en el período "día". */
  sinGasto: number | null;
  /** Los gastos individuales más grandes en pesos. */
  topGastos: GastoTop[];
  /** El gasto individual más grande en USD. */
  topGastoUsd: GastoTop | null;
  /** Conceptos en los que más se gasta (solo pesos; se agrupan "Arroz", "arroz " y "ARROZ"). */
  conceptos: ConceptoTop[];
}

export const MAX_RANKING = 5;

const SIN_ACENTO: Record<string, string> = {
  á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n',
};

/** Clave para agrupar conceptos: sin mayúsculas, sin acentos y sin espacios de más. */
export function claveConcepto(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .replace(/[áéíóúüñ]/g, (c) => SIN_ACENTO[c] ?? c)
    .replace(/\s+/g, ' ');
}

function textoDeGasto(g: GastoEstadistica): string {
  if (g.concepto && g.concepto.trim()) return g.concepto.trim();
  if (g.motivo_ahorro && g.motivo_ahorro.trim()) return `Retiro: ${g.motivo_ahorro.trim()}`;
  return g.sector_nombre;
}

function masGrandes(gastos: GastoEstadistica[], usd: boolean, n: number): GastoTop[] {
  return gastos
    .filter((g) => (g.forma === 'usd') === usd && aCentavos(g.monto) > 0)
    .sort((a, b) => aCentavos(b.monto) - aCentavos(a.monto) || b.fecha.localeCompare(a.fecha))
    .slice(0, n)
    .map((g) => ({
      texto: textoDeGasto(g),
      sector: g.sector_nombre,
      monto: g.monto,
      forma: g.forma,
      fecha: g.fecha,
    }));
}

function agruparConceptos(gastos: GastoEstadistica[], n: number): ConceptoTop[] {
  const grupos = new Map<string, { concepto: string; veces: number; cup: number }>();
  for (const g of gastos) {
    if (g.forma === 'usd' || !g.concepto || !g.concepto.trim()) continue;
    const clave = claveConcepto(g.concepto);
    const grupo = grupos.get(clave) ?? { concepto: g.concepto.trim().replace(/\s+/g, ' '), veces: 0, cup: 0 };
    grupo.veces += 1;
    grupo.cup += aCentavos(g.monto);
    grupos.set(clave, grupo);
  }
  return [...grupos.values()]
    .sort((a, b) => b.cup - a.cup || b.veces - a.veces || a.concepto.localeCompare(b.concepto))
    .slice(0, n)
    .map((g) => ({ concepto: g.concepto, veces: g.veces, cup: deCentavos(g.cup) }));
}

export function calcularDetalle(gastos: GastoEstadistica[], evolucion: Evolucion | null): DetalleGastos {
  const enPesos = gastos.filter((g) => g.forma !== 'usd');
  const totalCup = enPesos.reduce((s, g) => s + aCentavos(g.monto), 0);

  let mayor: BarraDestacada | null = null;
  let menor: BarraDestacada | null = null;
  let sinGasto: number | null = null;
  if (evolucion) {
    const empezadas = evolucion.barras.filter((b) => !b.futura);
    const conGasto = empezadas.filter((b) => aCentavos(b.cup) > 0);
    sinGasto = empezadas.length - conGasto.length;
    if (conGasto.length > 0) {
      const alta = conGasto.reduce((m, b) => (aCentavos(b.cup) > aCentavos(m.cup) ? b : m));
      const baja = conGasto.reduce((m, b) => (aCentavos(b.cup) < aCentavos(m.cup) ? b : m));
      mayor = { etiqueta: alta.etiquetaLarga, cup: alta.cup };
      menor = { etiqueta: baja.etiquetaLarga, cup: baja.cup };
    }
  }

  return {
    transaccionesCup: enPesos.length,
    transaccionesUsd: gastos.length - enPesos.length,
    promedioPorTransaccionCup:
      enPesos.length > 0 ? deCentavos(Math.round(totalCup / enPesos.length)) : null,
    mayor,
    menor,
    sinGasto,
    topGastos: masGrandes(gastos, false, MAX_RANKING),
    topGastoUsd: masGrandes(gastos, true, 1)[0] ?? null,
    conceptos: agruparConceptos(gastos, MAX_RANKING),
  };
}

// ---------------------------------------------------------------------------
// Uso del dinero por sector (lo repartido contra lo gastado)
// ---------------------------------------------------------------------------

export interface FilaUsoSector {
  sector_id: string;
  nombre: string;
  tipo: TipoSector;
  color: string | null;
  repartidoCup: number;
  gastadoCup: number;
  repartidoUsd: number;
  gastadoUsd: number;
  /** Gastado sobre repartido en pesos, en % (puede pasar de 100). null si no se repartió dinero en pesos. */
  porcentajeUsado: number | null;
  /** Repartido menos gastado en pesos; negativo si se gastó más de lo repartido en este período. */
  libreCup: number;
  libreUsd: number;
}

/** Para cada sector: lo que se le repartió en el período contra lo que gastó. El sector Ingresos no cuenta. */
export function calcularUsoSectores(
  repartos: RepartoPeriodo[],
  gastos: GastoEstadistica[],
): FilaUsoSector[] {
  type Acc = {
    base: Pick<FilaUsoSector, 'sector_id' | 'nombre' | 'tipo' | 'color'>;
    repCup: number;
    repUsd: number;
    gasCup: number;
    gasUsd: number;
  };
  const filas = new Map<string, Acc>();
  const acc = (
    id: string,
    nombre: string,
    tipo: TipoSector,
    color: string | null,
  ): Acc => {
    let a = filas.get(id);
    if (!a) {
      a = { base: { sector_id: id, nombre, tipo, color }, repCup: 0, repUsd: 0, gasCup: 0, gasUsd: 0 };
      filas.set(id, a);
    }
    return a;
  };

  for (const r of repartos) {
    if (r.sector_tipo === 'ingresos') continue;
    const a = acc(r.sector_id, r.sector_nombre, r.sector_tipo, r.sector_color);
    a.repCup += aCentavos(r.cup);
    a.repUsd += aCentavos(r.usd);
  }
  for (const g of gastos) {
    if (g.sector_tipo === 'ingresos') continue;
    const a = acc(g.sector_id, g.sector_nombre, g.sector_tipo, g.sector_color);
    if (g.forma === 'usd') a.gasUsd += aCentavos(g.monto);
    else a.gasCup += aCentavos(g.monto);
  }

  return [...filas.values()]
    .map((a) => ({
      ...a.base,
      repartidoCup: deCentavos(a.repCup),
      gastadoCup: deCentavos(a.gasCup),
      repartidoUsd: deCentavos(a.repUsd),
      gastadoUsd: deCentavos(a.gasUsd),
      porcentajeUsado: a.repCup > 0 ? porcentaje(a.gasCup, a.repCup) : null,
      libreCup: deCentavos(a.repCup - a.gasCup),
      libreUsd: deCentavos(a.repUsd - a.gasUsd),
      _orden: a.repCup,
    }))
    .sort((x, y) => y._orden - x._orden || x.nombre.localeCompare(y.nombre))
    .map(({ _orden, ...fila }) => fila);
}

// ---------------------------------------------------------------------------
// Estimación de cierre de mes
// ---------------------------------------------------------------------------

/** A partir de este día del mes ya hay suficientes datos para estimar. */
export const DIA_MINIMO_ESTIMACION = 5;

export interface EstimacionMes {
  /** Gasto en pesos que tendrías al cerrar el mes si sigues a este ritmo. */
  cierreCup: number;
  ritmoDiarioCup: number;
  diasTranscurridos: number;
  diasDelMes: number;
  /** true si ese cierre pasaría los ingresos en pesos del mes (y hubo ingresos). */
  superaIngresos: boolean;
}

/** Solo para el mes actual, desde el día 5 y si ya hubo gastos en pesos. En cualquier otro caso, null. */
export function estimarCierreMes(
  periodo: Periodo,
  desplazamiento: number,
  ahora: Date,
  gastoCup: number,
  ingresoCup: number,
): EstimacionMes | null {
  if (periodo !== 'mes' || desplazamiento !== 0) return null;
  const transcurridos = ahora.getDate();
  if (transcurridos < DIA_MINIMO_ESTIMACION) return null;
  const gastoCentavos = aCentavos(gastoCup);
  if (gastoCentavos <= 0) return null;

  const diasDelMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).getDate();
  const cierre = Math.round((gastoCentavos * diasDelMes) / transcurridos);
  return {
    cierreCup: deCentavos(cierre),
    ritmoDiarioCup: deCentavos(Math.round(gastoCentavos / transcurridos)),
    diasTranscurridos: transcurridos,
    diasDelMes,
    superaIngresos: aCentavos(ingresoCup) > 0 && cierre > aCentavos(ingresoCup),
  };
}

// ---------------------------------------------------------------------------
// Mensajes automáticos
// ---------------------------------------------------------------------------

export type TonoInsight = 'info' | 'alerta';

export interface Insight {
  id: string;
  tono: TonoInsight;
  texto: string;
}

/** Un sector con más de esta parte de los gastos en pesos "concentra" el gasto. */
export const UMBRAL_CONCENTRACION = 50;
/** Un sector "subió mucho" si gastó al menos este % más que antes… */
export const UMBRAL_SUBIDA = 30;
/** …y esa subida pesa al menos este % del gasto total en pesos del período. */
export const UMBRAL_PESO_SUBIDA = 5;

function generarInsights(
  periodo: Periodo,
  resumen: ResumenPeriodo,
  stats: Estadisticas,
  anterior: Estadisticas,
): Insight[] {
  const insights: Insight[] = [];
  const totalCup = aCentavos(stats.totalCup);

  // 1) Un sector se lleva más de la mitad de los gastos en pesos.
  const conGasto = stats.porSector.filter((s) => aCentavos(s.cup) > 0);
  const principal = conGasto[0];
  if (principal && conGasto.length >= 2 && principal.porcentaje > UMBRAL_CONCENTRACION) {
    insights.push({
      id: 'concentracion',
      tono: 'info',
      texto: `${principal.nombre} concentra el ${Math.round(principal.porcentaje)} % de tus gastos en pesos.`,
    });
  }

  // 2) El sector que más subió respecto al período anterior.
  const previos = new Map(anterior.porSector.map((s) => [s.sector_id, aCentavos(s.cup)]));
  let subida: { nombre: string; cambio: number; diferencia: number } | null = null;
  for (const s of conGasto) {
    const antes = previos.get(s.sector_id) ?? 0;
    const ahora = aCentavos(s.cup);
    if (antes <= 0) continue;
    const cambio = ((ahora - antes) / antes) * 100;
    const diferencia = ahora - antes;
    if (cambio < UMBRAL_SUBIDA || diferencia < (totalCup * UMBRAL_PESO_SUBIDA) / 100) continue;
    if (!subida || diferencia > subida.diferencia) subida = { nombre: s.nombre, cambio, diferencia };
  }
  if (subida) {
    insights.push({
      id: 'subida',
      tono: 'alerta',
      texto: `Los gastos de ${subida.nombre} subieron ${Math.round(subida.cambio)} % respecto a ${nombrePeriodoAnterior(periodo)}.`,
    });
  }

  // 3) Se gastó más de lo que entró.
  if (resumen.ingresos.cup > 0 && resumen.gastos.cup > resumen.ingresos.cup) {
    insights.push({
      id: 'sobregiro_cup',
      tono: 'alerta',
      texto: `Gastaste ${formatMonto(resumen.gastos.cup - resumen.ingresos.cup)} más de lo que ingresaste en pesos.`,
    });
  }
  if (resumen.ingresos.usd > 0 && resumen.gastos.usd > resumen.ingresos.usd) {
    insights.push({
      id: 'sobregiro_usd',
      tono: 'alerta',
      texto: `Gastaste ${formatMonto(resumen.gastos.usd - resumen.ingresos.usd, 'USD')} más de lo que ingresaste en USD.`,
    });
  }

  // 4) Hubo gastos pero ningún ingreso: salieron de dinero anterior.
  if (
    (resumen.gastos.cup > 0 || resumen.gastos.usd > 0) &&
    resumen.ingresos.cup === 0 &&
    resumen.ingresos.usd === 0
  ) {
    insights.push({
      id: 'sin_ingresos',
      tono: 'info',
      texto: 'No registraste ingresos en este período: lo gastado salió de dinero que ya tenías.',
    });
  }

  return insights;
}

// ---------------------------------------------------------------------------
// Todo junto
// ---------------------------------------------------------------------------

export interface PeriodoAnterior {
  inicio: Date;
  fin: Date;
  gastos: GastoEstadistica[];
  ingresos: Montos;
}

export interface EntradaAnalisis {
  periodo: Periodo;
  ahora: Date;
  desplazamiento: number;
  inicio: Date;
  fin: Date;
  gastos: GastoEstadistica[];
  ingresos: Montos;
  anterior: PeriodoAnterior;
  repartos: RepartoPeriodo[];
}

export interface AnalisisPeriodo {
  resumen: ResumenPeriodo;
  /** null si no hubo nada ni en este período ni en el anterior. */
  comparacion: ComparacionPeriodo | null;
  evolucion: Evolucion | null;
  detalle: DetalleGastos;
  insights: Insight[];
  estimacion: EstimacionMes | null;
  usoSectores: FilaUsoSector[];
}

/** Calcula todo el análisis a partir de lo leído de la base. `stats` son los gastos del período ya agregados. */
export function analizarPeriodo(e: EntradaAnalisis, stats: Estadisticas): AnalisisPeriodo {
  const anterior = agregarGastos(e.anterior.gastos, e.anterior.inicio, e.anterior.fin);

  const resumen = resumirPeriodo(e.ingresos, { cup: stats.totalCup, usd: stats.totalUsd });
  const resumenAnterior = resumirPeriodo(e.anterior.ingresos, { cup: anterior.totalCup, usd: anterior.totalUsd });

  const comparacion: ComparacionPeriodo = {
    gastosCup: calcularVariacion(resumen.gastos.cup, resumenAnterior.gastos.cup),
    ingresosCup: calcularVariacion(resumen.ingresos.cup, resumenAnterior.ingresos.cup),
    gastosUsd: calcularVariacion(resumen.gastos.usd, resumenAnterior.gastos.usd),
    ingresosUsd: calcularVariacion(resumen.ingresos.usd, resumenAnterior.ingresos.usd),
  };
  const hayAlgo = Object.values(comparacion).some((v) => v.tendencia !== 'sin_datos');

  const evolucion = calcularEvolucion(e.periodo, e.gastos, e.inicio, e.fin, e.ahora);

  return {
    resumen,
    comparacion: hayAlgo ? comparacion : null,
    evolucion,
    detalle: calcularDetalle(e.gastos, evolucion),
    insights: generarInsights(e.periodo, resumen, stats, anterior),
    estimacion: estimarCierreMes(e.periodo, e.desplazamiento, e.ahora, resumen.gastos.cup, resumen.ingresos.cup),
    usoSectores: calcularUsoSectores(e.repartos, e.gastos),
  };
}