/** Iconos y colores para mostrar formas de dinero y sectores. */
import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';
import type { Sector } from '../db/schema';
import type { FormaDinero, TipoSector } from '../types';
import { sectorColors } from './index';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export const formaIconos: Record<FormaDinero, IconName> = {
  efectivo: 'cash',
  transferencia: 'card',
  usd: 'logo-usd',
};

export const sectorIconos: Record<TipoSector, IconName> = {
  ingresos: 'trending-up',
  gastos_fijos: 'home',
  gustos: 'sparkles',
  ahorro: 'shield-checkmark',
  personalizado: 'pricetag',
};

/** Los sectores personalizados guardan su color; los base usan el del tema. */
export function colorDeSector(sector: Pick<Sector, 'tipo' | 'color'>): string {
  return sector.color ?? sectorColors[sector.tipo];
}

export function iconoDeSector(sector: Pick<Sector, 'tipo'>): IconName {
  return sectorIconos[sector.tipo];
}