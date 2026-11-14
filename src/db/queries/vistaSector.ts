import type { SQLiteDatabase } from 'expo-sqlite';
import { rangoMes } from '../../utils/fechas';
import type { TotalesPorForma } from '../../utils/totales';
import type { Movimiento, Sector } from '../schema';
import {
  getGastosSector,
  getHistorialAhorro,
  getIngresosMes,
  type HistorialAhorroItem,
  type IngresoMes,
} from './listados';
import { getSaldoSector, getSaldoSectorPorForma, type SaldoSector } from './saldosSectores';
import { getSectores } from './sectores';

/** Todo lo que necesita la pantalla de un sector, según su tipo. */
export type VistaSector =
  | { clase: 'ingresos'; sector: Sector; mes: string; ingresos: IngresoMes[] }
  | {
      clase: 'gastos';
      sector: Sector;
      mes: string;
      saldo: SaldoSector;
      saldoPorForma: TotalesPorForma;
      gastos: Movimiento[];
    }
  | {
      clase: 'ahorro';
      sector: Sector;
      saldo: SaldoSector;
      saldoPorForma: TotalesPorForma;
      historial: HistorialAhorroItem[];
      hayMas: boolean;
    };

/** Carga los datos de un sector. Devuelve null si el sector no existe. */
export async function cargarVistaSector(
  db: SQLiteDatabase,
  sectorId: string,
  ahora: Date = new Date(),
): Promise<VistaSector | null> {
  const sectores = await getSectores(db);
  const sector = sectores.find((s) => s.id === sectorId);
  if (!sector) return null;

  const rango = rangoMes(ahora);

  if (sector.tipo === 'ingresos') {
    return { clase: 'ingresos', sector, mes: rango.etiqueta, ingresos: await getIngresosMes(db, rango) };
  }

  const saldo = await getSaldoSector(db, sector.id);
  const saldoPorForma = await getSaldoSectorPorForma(db, sector.id);

  if (sector.tipo === 'ahorro') {
    const { items, hayMas } = await getHistorialAhorro(db, sector.id);
    return { clase: 'ahorro', sector, saldo, saldoPorForma, historial: items, hayMas };
  }

  return {
    clase: 'gastos',
    sector,
    mes: rango.etiqueta,
    saldo,
    saldoPorForma,
    gastos: await getGastosSector(db, sector.id, rango),
  };
}