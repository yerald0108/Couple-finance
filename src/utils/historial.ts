import { formatFechaHora, rangoMes } from './fechas';
import { textoReciente } from './notificaciones';

/** Cuántos movimientos se leen cada vez que se llega al final de la lista del historial. */
export const PAGINA_HISTORIAL = 50;

/**
 * Qué límite pedir cuando la lista llega al final, o null si no hay que pedir nada.
 * Solo se pide más si hay más que leer (`hayMas`) y si ya llegó lo último que se pidió (`limiteLeido === limiteActual`):
 * la lista avisa varias veces seguidas del final, y sin esa segunda condición cada aviso pediría otras 50 filas.
 */
export function limiteSiguiente(hayMas: boolean, limiteLeido: number, limiteActual: number): number | null {
  if (!hayMas || limiteLeido !== limiteActual) return null;
  return limiteActual + PAGINA_HISTORIAL;
}

/** Qué movimientos se ven: todos, solo ingresos, o todo lo que sale (gastos y retiros de ahorro). */
export type FiltroTipo = 'todos' | 'ingresos' | 'gastos';

export const FILTROS_TIPO: { value: FiltroTipo; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'ingresos', label: 'Ingresos' },
  { value: 'gastos', label: 'Gastos' },
];

/** Un mes concreto del calendario local. `mes` va de 0 (enero) a 11 (diciembre), como `Date.getMonth()`. */
export interface MesFiltro {
  anio: number;
  mes: number;
}

export function mesDe(fecha: Date): MesFiltro {
  return { anio: fecha.getFullYear(), mes: fecha.getMonth() };
}

/** El mes de una fecha ISO, o null si la fecha no es válida. */
export function mesDeIso(iso: string): MesFiltro | null {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? null : mesDe(fecha);
}

/** El mes `delta` meses después (o antes, si es negativo). Cruza los años sin problema. */
export function moverMes(mes: MesFiltro, delta: number): MesFiltro {
  return mesDe(new Date(mes.anio, mes.mes + delta, 1));
}

/** Negativo si `a` es anterior a `b`, 0 si es el mismo mes, positivo si es posterior. */
export function compararMes(a: MesFiltro, b: MesFiltro): number {
  return (a.anio - b.anio) * 12 + (a.mes - b.mes);
}

/** "Noviembre 2026". */
export function etiquetaMes(mes: MesFiltro): string {
  return rangoMes(new Date(mes.anio, mes.mes, 1)).etiqueta;
}

/** Límites del mes (hora local) en ISO UTC, para comparar directamente en la base: `desde` incluido, `hasta` excluido. */
export function rangoDeMes(mes: MesFiltro): { desde: string; hasta: string } {
  const { desde, hasta } = rangoMes(new Date(mes.anio, mes.mes, 1));
  return { desde, hasta };
}

/**
 * Cuándo fue un movimiento, para el historial. Como la lista puede abarcar años, si no es de este año se
 * muestra el año ("12 nov 2025, 5:51 PM"). Lo de hoy sale como "hace 5 min" y lo demás como "12 nov, 5:51 PM".
 */
export function textoFechaHistorial(iso: string, ahora: Date = new Date()): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  if (fecha.getFullYear() === ahora.getFullYear()) return textoReciente(iso, ahora);
  const [dia, hora] = formatFechaHora(iso).split(', ');
  return `${dia} ${fecha.getFullYear()}, ${hora}`;
}