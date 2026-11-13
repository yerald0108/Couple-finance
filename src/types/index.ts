/** Tipos de dominio compartidos por toda la app. */

/** Las 3 formas de dinero. Efectivo y transferencia son en pesos; USD va aparte. */
export type FormaDinero = 'efectivo' | 'transferencia' | 'usd';

export type Moneda = 'CUP' | 'USD';

/** Sectores base + los creados por el usuario. */
export type TipoSector =
  | 'ingresos'
  | 'gastos_fijos'
  | 'gustos'
  | 'ahorro'
  | 'personalizado';

/**
 * Tipo de cada movimiento:
 * - ingreso: dinero que entra (se reparte entre sectores)
 * - gasto_fijo / gusto: gastos de los sectores base Gastos fijos y Gustos
 * - gasto: gastos de un sector creado por el usuario
 * - ahorro: salida de dinero del sector Ahorro (siempre con motivo)
 */
export type TipoMovimiento = 'ingreso' | 'gasto_fijo' | 'gusto' | 'gasto' | 'ahorro';

export type OrigenIngreso = 'salario' | 'ganancia' | 'prestamo' | 'otro';

/** Preparado para la Fase 7 (identificación de pareja). */
export type Persona = 'persona_1' | 'persona_2';