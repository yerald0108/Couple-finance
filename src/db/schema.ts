/** Tipos TypeScript que reflejan cada tabla (una fila = un objeto). */
import type {
  FormaDinero,
  Moneda,
  OrigenIngreso,
  TipoMovimiento,
  TipoSector,
} from '../types';

export interface Sector {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: TipoSector;
  icono: string | null;
  color: string | null;
  activo: number; // 1 = activo, 0 = archivado
  orden: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Cuenta {
  id: string;
  nombre: string;
  tipo: FormaDinero;
  moneda: Moneda;
  saldo: number;
  created_at: string;
  updated_at: string;
}

export interface Ajuste {
  clave: string;
  valor: string;
  updated_at: string;
}

export interface Movimiento {
  id: string;
  tipo: TipoMovimiento;
  monto: number;
  forma: FormaDinero;
  concepto: string | null;
  origen: OrigenIngreso | null;
  sector_id: string;
  motivo_ahorro: string | null;
  es_salida_ahorro: number; // 1 = salida del ahorro
  fecha: string;
  /** Id de la cuenta (Supabase) que registró el movimiento. null = aún sin dueño (de antes de sincronizar). */
  registrado_por: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Reparto {
  id: string;
  movimiento_id: string;
  sector_id: string;
  monto: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}