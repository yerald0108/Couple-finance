/**
 * Validaciones y textos de la cuenta (correo, contraseña, nombre, código de pareja).
 * Son funciones puras: no tocan internet ni la base, por eso se pueden probar sin teléfono.
 */

export const NOMBRE_PAREJA_MAX = 20;
export const PASSWORD_MIN = 8;
/** bcrypt (lo que usa Supabase) solo lee los primeros 72 bytes de la contraseña. */
export const PASSWORD_MAX = 72;
export const CODIGO_LARGO = 8;
/** Mismo alfabeto que genera Supabase: sin 0, O, 1, I ni L, que se confunden al leerlos. */
export const CODIGO_ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export interface ResultadoCampo {
  valido: boolean;
  /** Valor ya limpio (sin espacios sobrantes, etc.) listo para enviar. */
  valor: string;
  error?: string;
}

export function validarEmail(crudo: string): ResultadoCampo {
  const valor = crudo.trim().toLowerCase();
  if (valor === '') return { valido: false, valor, error: 'Escribe tu correo.' };
  if (valor.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor)) {
    return { valido: false, valor, error: 'Ese correo no parece válido.' };
  }
  return { valido: true, valor };
}

/** Al crear la cuenta: mínimo 8 caracteres. */
export function validarPasswordNueva(password: string): ResultadoCampo {
  if (password === '') return { valido: false, valor: password, error: 'Escribe una contraseña.' };
  if (password.length < PASSWORD_MIN) {
    return { valido: false, valor: password, error: `Usa al menos ${PASSWORD_MIN} caracteres.` };
  }
  if (new TextEncoder().encode(password).length > PASSWORD_MAX) {
    return { valido: false, valor: password, error: `Máximo ${PASSWORD_MAX} caracteres.` };
  }
  return { valido: true, valor: password };
}

/** Al entrar no se exige longitud: solo que no esté vacía (la contraseña ya existe). */
export function validarPasswordEntrada(password: string): ResultadoCampo {
  if (password === '') return { valido: false, valor: password, error: 'Escribe tu contraseña.' };
  return { valido: true, valor: password };
}

export function validarRepetirPassword(password: string, repetida: string): ResultadoCampo {
  if (repetida !== password) {
    return { valido: false, valor: repetida, error: 'Las contraseñas no coinciden.' };
  }
  return { valido: true, valor: repetida };
}

/** Quita espacios de más (también los del medio) y exige entre 1 y 20 letras. */
export function validarNombrePareja(crudo: string): ResultadoCampo {
  const valor = crudo.replace(/\s+/g, ' ').trim();
  const largo = Array.from(valor).length;
  if (largo === 0) return { valido: false, valor, error: 'Escribe tu nombre.' };
  if (largo > NOMBRE_PAREJA_MAX) {
    return { valido: false, valor, error: `Máximo ${NOMBRE_PAREJA_MAX} letras.` };
  }
  return { valido: true, valor };
}

/** "abcd-efgh" / "ABCD EFGH" → "ABCDEFGH". */
export function normalizarCodigo(crudo: string): string {
  return crudo.replace(/[\s-]/g, '').toUpperCase();
}

export function validarCodigo(crudo: string): ResultadoCampo {
  const valor = normalizarCodigo(crudo);
  if (valor === '') return { valido: false, valor, error: 'Escribe el código de tu pareja.' };
  const buenos =
    valor.length === CODIGO_LARGO && [...valor].every((c) => CODIGO_ALFABETO.includes(c));
  if (!buenos) {
    return {
      valido: false,
      valor,
      error: `El código tiene ${CODIGO_LARGO} letras y números (sin 0, O, 1, I ni L).`,
    };
  }
  return { valido: true, valor };
}

/** "ABCDEFGH" → "ABCD-EFGH" para mostrarlo y leerlo más fácil. */
export function formatearCodigo(codigo: string): string {
  const limpio = normalizarCodigo(codigo);
  return limpio.length === CODIGO_LARGO ? `${limpio.slice(0, 4)}-${limpio.slice(4)}` : limpio;
}

export interface ConfigSupabase {
  url: string;
  llave: string;
}

/**
 * Comprueba la dirección (URL) y la llave pública de Supabase que vienen de las variables de entorno.
 * Devuelve null si falta alguna o la dirección no es https: la app entonces funciona solo en local.
 */
export function leerConfigSupabase(
  url: string | undefined,
  llave: string | undefined,
): ConfigSupabase | null {
  const u = (url ?? '').trim().replace(/\/+$/, '');
  const k = (llave ?? '').trim();
  if (!/^https:\/\/[^\s/]+\.[^\s/]+$/.test(u) || k === '') return null;
  return { url: u, llave: k };
}

// ---------------------------------------------------------------------------------------------
// Errores: de Supabase (en inglés) a mensajes en español para la persona.
// ---------------------------------------------------------------------------------------------

interface ErrorLike {
  message?: unknown;
  code?: unknown;
  name?: unknown;
  status?: unknown;
}

function comoErrorLike(e: unknown): ErrorLike {
  return typeof e === 'object' && e !== null ? (e as ErrorLike) : { message: e };
}

/** true si el fallo es de conexión (sin internet, servidor inalcanzable, tiempo agotado). */
export function esErrorDeRed(e: unknown): boolean {
  const { message, name, status } = comoErrorLike(e);
  const texto = typeof message === 'string' ? message : '';
  if (name === 'AuthRetryableFetchError') return true;
  if (typeof status === 'number' && status === 0) return true;
  return /network request failed|failed to fetch|fetch failed|networkerror|network error|timed? ?out|enotfound|econnrefused|econnreset|offline/i.test(
    texto,
  );
}

/** Errores de las funciones de Supabase de la pareja: ya vienen escritos en español, se muestran tal cual. */
const CODIGOS_SQL_PROPIOS = new Set(['28000', '22023', '23505', '23514', 'P0002', '55000']);

export function traducirErrorSupabase(e: unknown): string {
  const { message, code } = comoErrorLike(e);
  const texto = typeof message === 'string' ? message : '';
  const codigo = typeof code === 'string' ? code : '';

  if (esErrorDeRed(e)) return 'No hay conexión a internet.';

  switch (codigo) {
    case 'invalid_credentials':
      return 'Correo o contraseña incorrectos.';
    case 'user_already_exists':
    case 'email_exists':
      return 'Ese correo ya tiene una cuenta. Usa «Entrar».';
    case 'weak_password':
      return `La contraseña es muy débil. Usa al menos ${PASSWORD_MIN} caracteres.`;
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Demasiados intentos. Espera unos minutos y vuelve a probar.';
    case 'email_not_confirmed':
      return 'Falta confirmar el correo. Revisa tu bandeja de entrada.';
    case 'signup_disabled':
      return 'Crear cuentas está desactivado en Supabase.';
    case 'validation_failed':
    case 'email_address_invalid':
      return 'Ese correo no es válido.';
    case 'refresh_token_not_found':
    case 'refresh_token_already_used':
    case 'session_expired':
    case 'session_not_found':
    case 'PGRST301':
    case 'PGRST303':
      return 'Tu sesión venció. Entra otra vez.';
    case 'PGRST202':
    case 'PGRST205':
    case '42P01':
      return 'Falta preparar la base de datos de Supabase (no se ejecutó el SQL de la pareja).';
    default:
  }

  if (CODIGOS_SQL_PROPIOS.has(codigo) && texto !== '') return texto;
  if (/invalid login credentials/i.test(texto)) return 'Correo o contraseña incorrectos.';
  if (/already registered/i.test(texto)) return 'Ese correo ya tiene una cuenta. Usa «Entrar».';
  if (/invalid api key|apikey/i.test(texto)) return 'La llave de Supabase no es válida. Revisa el archivo .env.';
  return texto === ''
    ? 'No se pudo completar la acción. Inténtalo otra vez.'
    : `No se pudo completar la acción. (${texto})`;
}