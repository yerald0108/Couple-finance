const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Indexado por Date.getDay(): 0 = domingo. */
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export interface RangoMes {
  /** Inicio del mes (incluido), en ISO UTC. */
  desde: string;
  /** Inicio del mes siguiente (excluido), en ISO UTC. */
  hasta: string;
  /** Por ejemplo "Noviembre 2026". */
  etiqueta: string;
}

/**
 * Rango del mes de `ahora` en HORA LOCAL del teléfono. Las fechas se guardan en UTC,
 * así que el límite se convierte a UTC para poder comparar directamente en la base.
 */
export function rangoMes(ahora: Date = new Date()): RangoMes {
  const anio = ahora.getFullYear();
  const mes = ahora.getMonth();
  return {
    desde: new Date(anio, mes, 1).toISOString(),
    hasta: new Date(anio, mes + 1, 1).toISOString(),
    etiqueta: `${MESES[mes]} ${anio}`,
  };
}

/** Fecha y hora en hora local, para mostrar: "12 nov, 5:51 PM". */
export function formatFechaHora(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';

  const hora24 = fecha.getHours();
  const hora12 = hora24 % 12 === 0 ? 12 : hora24 % 12;
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  const sufijo = hora24 >= 12 ? 'PM' : 'AM';

  return `${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()]}, ${hora12}:${minutos} ${sufijo}`;
}

// ---------------------------------------------------------------------------
// Períodos para Estadísticas (día, semana, mes, año)
// ---------------------------------------------------------------------------

export type Periodo = 'dia' | 'semana' | 'mes' | 'anio';

export interface RangoPeriodo {
  periodo: Periodo;
  /** Primer día del período a las 00:00 (hora local, incluido). */
  inicio: Date;
  /** Primer día DESPUÉS del período a las 00:00 (hora local, excluido). */
  fin: Date;
  /** Lo mismo que `inicio`, en ISO UTC, para comparar en la base de datos. */
  desde: string;
  /** Lo mismo que `fin`, en ISO UTC. */
  hasta: string;
  /** Texto para mostrar: "Hoy, 13 nov", "9 – 15 nov 2026", "Noviembre 2026", "2026". */
  etiqueta: string;
}

/**
 * Rango de un período en HORA LOCAL.
 * - `desplazamiento` 0 = el período de `ahora`; -1 = el anterior; -2 = el anterior a ese; etc.
 * - La semana va de lunes a domingo; el año va del 1 de enero al 31 de diciembre.
 * Se construye con `new Date(año, mes, día)`, que respeta los cambios de hora (un día puede durar 23 o 25 horas).
 */
export function rangoPeriodo(
  periodo: Periodo,
  ahora: Date = new Date(),
  desplazamiento = 0,
): RangoPeriodo {
  const anio = ahora.getFullYear();
  const mes = ahora.getMonth();
  const dia = ahora.getDate();

  let inicio: Date;
  let fin: Date;

  if (periodo === 'dia') {
    inicio = new Date(anio, mes, dia + desplazamiento);
    fin = new Date(anio, mes, dia + desplazamiento + 1);
  } else if (periodo === 'semana') {
    const diasDesdeLunes = (ahora.getDay() + 6) % 7;
    const lunes = dia - diasDesdeLunes + 7 * desplazamiento;
    inicio = new Date(anio, mes, lunes);
    fin = new Date(anio, mes, lunes + 7);
  } else if (periodo === 'mes') {
    inicio = new Date(anio, mes + desplazamiento, 1);
    fin = new Date(anio, mes + desplazamiento + 1, 1);
  } else {
    inicio = new Date(anio + desplazamiento, 0, 1);
    fin = new Date(anio + desplazamiento + 1, 0, 1);
  }

  return {
    periodo,
    inicio,
    fin,
    desde: inicio.toISOString(),
    hasta: fin.toISOString(),
    etiqueta: etiquetaPeriodo(periodo, inicio, fin, ahora, desplazamiento),
  };
}

function etiquetaPeriodo(
  periodo: Periodo,
  inicio: Date,
  fin: Date,
  ahora: Date,
  desplazamiento: number,
): string {
  if (periodo === 'anio') {
    return String(inicio.getFullYear());
  }

  if (periodo === 'mes') {
    return `${MESES[inicio.getMonth()]} ${inicio.getFullYear()}`;
  }

  if (periodo === 'dia') {
    const corto = `${inicio.getDate()} ${MESES_CORTOS[inicio.getMonth()]}`;
    if (desplazamiento === 0) return `Hoy, ${corto}`;
    if (desplazamiento === -1) return `Ayer, ${corto}`;
    const anio = inicio.getFullYear() === ahora.getFullYear() ? '' : ` ${inicio.getFullYear()}`;
    return `${DIAS[inicio.getDay()]} ${corto}${anio}`;
  }

  return etiquetaRango(inicio, fin);
}

/** "9 – 15 nov 2026" para un rango de días [inicio, fin) (fin excluido). */
export function etiquetaRango(inicio: Date, fin: Date): string {
  const ultimo = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate() - 1);
  if (claveDia(inicio) === claveDia(ultimo)) {
    return `${inicio.getDate()} ${MESES_CORTOS[inicio.getMonth()]} ${inicio.getFullYear()}`;
  }
  const mesIni = MESES_CORTOS[inicio.getMonth()];
  const mesFin = MESES_CORTOS[ultimo.getMonth()];

  if (inicio.getFullYear() !== ultimo.getFullYear()) {
    return `${inicio.getDate()} ${mesIni} ${inicio.getFullYear()} – ${ultimo.getDate()} ${mesFin} ${ultimo.getFullYear()}`;
  }
  if (inicio.getMonth() !== ultimo.getMonth()) {
    return `${inicio.getDate()} ${mesIni} – ${ultimo.getDate()} ${mesFin} ${ultimo.getFullYear()}`;
  }
  return `${inicio.getDate()} – ${ultimo.getDate()} ${mesFin} ${ultimo.getFullYear()}`;
}

/** Clave "2026-11-13" del día LOCAL de una fecha (sirve para agrupar gastos por día). */
export function claveDia(fecha: Date): string {
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mm}-${dd}`;
}

/** Cada día (a las 00:00 local) desde `inicio` hasta antes de `fin`. */
export function diasEntre(inicio: Date, fin: Date): Date[] {
  const dias: Date[] = [];
  for (let i = 0; ; i++) {
    const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
    if (d.getTime() >= fin.getTime()) break;
    dias.push(d);
  }
  return dias;
}

/** "Lunes 9 nov" (siempre con el día de la semana, sin año). */
export function etiquetaDia(fecha: Date): string {
  return `${DIAS[fecha.getDay()]} ${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()]}`;
}

/** "Noviembre 2026". */
export function etiquetaMes(fecha: Date): string {
  return `${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

/** "ene", "feb"… (3 letras) del mes de una fecha. */
export function mesCorto(fecha: Date): string {
  return MESES_CORTOS[fecha.getMonth()];
}

/** Cuántos días del rango [inicio, fin) ya empezaron a la hora `ahora` (el día de hoy cuenta). */
export function diasTranscurridos(inicio: Date, fin: Date, ahora: Date): number {
  return diasEntre(inicio, fin).filter((d) => d.getTime() <= ahora.getTime()).length;
}

export interface RangoComparable {
  inicio: Date;
  /** Fin excluido (puede ser anterior al fin del período anterior completo si se compara el mismo tramo). */
  fin: Date;
  desde: string;
  hasta: string;
  /** true = solo se toma el mismo tramo (los mismos primeros días) del período anterior. */
  parcial: boolean;
  /** Cuántos días abarca la comparación. */
  dias: number;
  /** "Octubre 2026", "1 – 14 oct 2026"… */
  etiqueta: string;
}

/**
 * Período con el que se compara el que se está viendo: el inmediatamente anterior.
 * Si se está viendo el período ACTUAL (que todavía no terminó) de semana, mes o año, se compara contra el
 * mismo tramo del anterior (los mismos primeros días), para no decir "gastaste 60 % menos" solo porque
 * el mes va por la mitad. El día se compara contra el día anterior completo.
 */
export function rangoComparable(
  periodo: Periodo,
  ahora: Date = new Date(),
  desplazamiento = 0,
): RangoComparable {
  const actual = rangoPeriodo(periodo, ahora, desplazamiento);
  const previo = rangoPeriodo(periodo, ahora, desplazamiento - 1);

  let fin = previo.fin;
  let parcial = false;
  if (desplazamiento === 0 && periodo !== 'dia') {
    const n = diasTranscurridos(actual.inicio, actual.fin, ahora);
    const corte = new Date(previo.inicio.getFullYear(), previo.inicio.getMonth(), previo.inicio.getDate() + n);
    if (corte.getTime() < previo.fin.getTime()) {
      fin = corte;
      parcial = true;
    }
  }

  return {
    inicio: previo.inicio,
    fin,
    desde: previo.inicio.toISOString(),
    hasta: fin.toISOString(),
    parcial,
    dias: diasEntre(previo.inicio, fin).length,
    etiqueta: parcial ? etiquetaRango(previo.inicio, fin) : previo.etiqueta,
  };
}