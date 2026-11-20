import type { MiembroPareja } from '../lib/cuentaService';
import { textoHace } from '../sync/sesionSync';
import { FORMA_LABEL } from './constants';
import { monedaDeForma, origenLabel } from './etiquetas';
import { formatFechaHora } from './fechas';
import { formatMonto } from './formatters';

/** Solo se avisa como "nuevo" lo que la pareja registró en los últimos días (así una descarga inicial grande no llena de avisos). */
export const VENTANA_NUEVAS_DIAS = 7;

/** Lo que se necesita de un movimiento para mostrarlo como notificación. */
export interface DatosNotificacion {
  tipo: string;
  monto: number;
  forma: 'efectivo' | 'transferencia' | 'usd';
  concepto: string | null;
  origen: string | null;
  motivo_ahorro: string | null;
  sector_nombre: string;
}

export interface Autor {
  /** Nombre para mostrar ("Tú", el nombre de la pareja) o null si no se sabe quién lo registró. */
  nombre: string | null;
  esYo: boolean;
}

/** Quién registró el movimiento, según la cuenta guardada en `registrado_por`. */
export function autorDe(registradoPor: string | null, yoId: string | null, miembros: MiembroPareja[]): Autor {
  if (!registradoPor) return { nombre: null, esYo: false };
  if (yoId !== null && registradoPor === yoId) return { nombre: 'Tú', esYo: true };
  const miembro = miembros.find((m) => m.user_id === registradoPor);
  return { nombre: miembro ? miembro.nombre : 'Tu pareja', esYo: false };
}

export function esIngreso(d: Pick<DatosNotificacion, 'tipo'>): boolean {
  return d.tipo === 'ingreso';
}

export function esRetiroAhorro(d: Pick<DatosNotificacion, 'tipo'>): boolean {
  return d.tipo === 'ahorro';
}

function queFue(d: Pick<DatosNotificacion, 'tipo'>): { articulo: string; que: string } {
  if (esIngreso(d)) return { articulo: 'un', que: 'ingreso' };
  if (esRetiroAhorro(d)) return { articulo: 'un', que: 'retiro de ahorro' };
  return { articulo: 'un', que: 'gasto' };
}

/** "Beto registró un gasto", "Registraste un ingreso", "Se registró un retiro de ahorro". */
export function fraseNotificacion(d: Pick<DatosNotificacion, 'tipo'>, autor: Autor): string {
  const { articulo, que } = queFue(d);
  if (autor.esYo) return `Registraste ${articulo} ${que}`;
  if (autor.nombre) return `${autor.nombre} registró ${articulo} ${que}`;
  return `Se registró ${articulo} ${que}`;
}

/** Segunda línea: qué fue y dónde ("Arroz · Gustos · Efectivo"). */
export function detalleNotificacion(d: DatosNotificacion): string {
  const forma = FORMA_LABEL[d.forma];
  if (esIngreso(d)) return `${origenLabel(d.origen)} · ${forma}`;
  if (esRetiroAhorro(d)) return `${d.motivo_ahorro ?? 'Retiro'} · ${d.sector_nombre} · ${forma}`;
  return `${d.concepto ?? 'Gasto'} · ${d.sector_nombre} · ${forma}`;
}

/** "+$100.00" para ingresos y "-$25.00" para lo demás. */
export function montoConSigno(d: Pick<DatosNotificacion, 'tipo' | 'monto' | 'forma'>): string {
  return `${esIngreso(d) ? '+' : '-'}${formatMonto(d.monto, monedaDeForma(d.forma))}`;
}

/** "hace 5 min" durante el primer día y después la fecha ("12 nov, 5:51 PM"). */
export function textoReciente(iso: string, ahora: Date = new Date()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  if (ahora.getTime() - t < 24 * 3600 * 1000) return textoHace(iso, ahora);
  return formatFechaHora(iso);
}

/** Inicial para el círculo de la persona. */
export function inicialDe(autor: Autor): string {
  if (autor.esYo) return 'T';
  return Array.from(autor.nombre ?? '?')[0]?.toUpperCase() ?? '?';
}

/** Número para la insignia de la campana: "9+" a partir de 10. */
export function textoInsignia(n: number): string {
  return n > 9 ? '9+' : String(n);
}