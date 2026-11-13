/**
 * Manejo de montos escritos por el usuario.
 * Las comparaciones y sumas se hacen en CENTAVOS (números enteros) para que
 * 0.1 + 0.2 sea exactamente 0.3 y "la suma del reparto es igual al monto" nunca falle por decimales.
 */

/** Máximo de cifras enteras que se aceptan (hasta 999,999,999.99). */
export const MAX_ENTEROS = 9;

/** Pasa un monto a centavos enteros: 12.34 -> 1234. */
export function aCentavos(valor: number): number {
  return Math.round(valor * 100);
}

/** Pasa centavos enteros a monto: 1234 -> 12.34. */
export function deCentavos(centavos: number): number {
  return centavos / 100;
}

function limpiarEntera(entera: string): string {
  return entera.replace(/^0+(?=\d)/, '').slice(0, MAX_ENTEROS);
}

/**
 * Limpia lo que el usuario va escribiendo en un campo de monto:
 * solo dígitos y UN separador decimal (la coma se convierte en punto, porque
 * los teclados en español la ponen), máximo 2 decimales, sin ceros a la izquierda.
 */
export function limpiarMontoTexto(texto: string): string {
  const t = texto.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const punto = t.indexOf('.');
  if (punto === -1) return limpiarEntera(t);

  const entera = limpiarEntera(t.slice(0, punto) || '0');
  const decimales = t.slice(punto + 1).replace(/\./g, '').slice(0, 2);
  return `${entera}.${decimales}`;
}

/** Texto -> centavos. Devuelve null si está vacío o no es un monto válido. */
export function parseMontoCentavos(texto: string): number | null {
  const t = texto.trim();
  if (!/^\d+(\.\d{0,2})?$/.test(t)) return null;
  return aCentavos(Number(t));
}