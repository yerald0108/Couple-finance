export const NOMBRE_MIN = 2;
export const NOMBRE_MAX = 24;
export const USO_MIN = 3;
export const USO_MAX = 80;

export interface EntradaSector {
  nombre: string;
  descripcion: string;
}

export interface ErroresSector {
  nombre?: string;
  descripcion?: string;
}

export interface ResultadoValidacion {
  valido: boolean;
  errores: ErroresSector;
  /** Los mismos datos ya limpios (sin espacios de más), listos para guardar. */
  datos: EntradaSector;
}

const SIN_ACENTO: Record<string, string> = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u' };

/** Para comparar nombres: sin mayúsculas, sin tildes (salvo la ñ) y sin espacios repetidos. */
export function normalizarNombre(texto: string): string {
  return texto
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/[áéíóúü]/g, (c) => SIN_ACENTO[c]);
}

/**
 * Valida el formulario de "Nuevo sector".
 * `existentes` son los sectores ya creados (base y personalizados): no se permiten nombres repetidos.
 */
export function validarSector(
  entrada: EntradaSector,
  existentes: { nombre: string }[],
): ResultadoValidacion {
  const nombre = entrada.nombre.trim().replace(/\s+/g, ' ');
  const descripcion = entrada.descripcion.trim().replace(/\s+/g, ' ');
  const errores: ErroresSector = {};

  if (nombre.length === 0) {
    errores.nombre = 'Escribe un nombre para el sector.';
  } else if (nombre.length < NOMBRE_MIN) {
    errores.nombre = `El nombre es muy corto (mínimo ${NOMBRE_MIN} letras).`;
  } else if (nombre.length > NOMBRE_MAX) {
    errores.nombre = `El nombre es muy largo (máximo ${NOMBRE_MAX} letras).`;
  } else if (existentes.some((s) => normalizarNombre(s.nombre) === normalizarNombre(nombre))) {
    errores.nombre = `Ya existe un sector llamado "${nombre}".`;
  }

  if (descripcion.length === 0) {
    errores.descripcion = 'Cuéntanos para qué usarás este dinero.';
  } else if (descripcion.length < USO_MIN) {
    errores.descripcion = `Describe un poco más el uso (mínimo ${USO_MIN} letras).`;
  } else if (descripcion.length > USO_MAX) {
    errores.descripcion = `La descripción es muy larga (máximo ${USO_MAX} letras).`;
  }

  return {
    valido: errores.nombre === undefined && errores.descripcion === undefined,
    errores,
    datos: { nombre, descripcion },
  };
}