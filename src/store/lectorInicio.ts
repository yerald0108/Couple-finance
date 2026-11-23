import type { SQLiteDatabase } from 'expo-sqlite';
import { claveMes } from '../utils/cierreMes';
import { useCierreStore } from './useCierreStore';
import { useCuentasStore } from './useCuentasStore';
import { useSaldosSectoresStore } from './useSaldosSectoresStore';
import { useSectoresStore } from './useSectoresStore';

/**
 * Decide qué lee Inicio de la base local cada vez que se vuelve a la pestaña.
 *
 * Cuentas, sectores y saldos NO se vuelven a leer si desde la última lectura completa no cambió nada que pueda
 * haberlos movido:
 *  - Lo que se guarda en este teléfono (gasto, ingreso, edición, borrado, sector nuevo) ya actualiza esos datos
 *    en el momento, desde `useCuentasStore` y `useSectoresStore`.
 *  - Lo que llega de la pareja sube `datosVersion` (clave distinta, se lee).
 *  - Si cambia el mes, "ingresos del mes" cambia sin que nadie escriba nada (clave distinta, se lee).
 *  - Si la lectura anterior falló, se reintenta.
 * El aviso del cierre sí se consulta siempre: es una sola consulta barata y puede cambiar por un movimiento
 * del mes pasado que se edita o se elimina.
 */
export function crearLectorInicio() {
  let ultimaLectura: string | null = null;

  return {
    /** Devuelve true si leyó cuentas, sectores y saldos, y false si se saltó esa lectura. */
    async leer(db: SQLiteDatabase, datosVersion: number, ahora: Date = new Date()): Promise<boolean> {
      const cierre = useCierreStore.getState().cargar(db);

      const clave = `${datosVersion}|${claveMes(ahora)}`;
      if (clave === ultimaLectura) {
        await cierre;
        return false;
      }
      ultimaLectura = clave;

      await Promise.all([
        useCuentasStore.getState().cargar(db),
        useSectoresStore.getState().cargar(db),
        useSaldosSectoresStore.getState().cargar(db),
        cierre,
      ]);

      // Si alguna lectura falló (los stores guardan el error), la próxima vez se vuelve a intentar.
      if (
        useCuentasStore.getState().error !== null ||
        useSectoresStore.getState().error !== null ||
        useSaldosSectoresStore.getState().error !== null
      ) {
        ultimaLectura = null;
      }
      return true;
    },
  };
}