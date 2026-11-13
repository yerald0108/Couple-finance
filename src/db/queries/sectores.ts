import type { SQLiteDatabase } from 'expo-sqlite';
import { PALETA_SECTORES } from '../../utils/constants';
import { newId } from '../../utils/uuid';
import { validarSector, type EntradaSector } from '../../utils/sectorValidation';
import type { Sector } from '../schema';

/** Sectores activos (no archivados ni borrados), en su orden. */
export async function getSectores(db: SQLiteDatabase): Promise<Sector[]> {
  return db.getAllAsync<Sector>(
    `SELECT * FROM sectores
     WHERE deleted_at IS NULL AND activo = 1
     ORDER BY orden ASC, created_at ASC`,
  );
}

/**
 * Crea un sector personalizado (nombre + uso del dinero). Vuelve a validar aquí,
 * así un nombre repetido nunca llega a la base aunque falle la validación de la pantalla.
 */
export async function crearSector(db: SQLiteDatabase, entrada: EntradaSector): Promise<Sector> {
  const existentes = await getSectores(db);
  const { valido, errores, datos } = validarSector(entrada, existentes);
  if (!valido) {
    throw new Error(errores.nombre ?? errores.descripcion ?? 'Los datos del sector no son válidos.');
  }

  const ahora = new Date().toISOString();
  const personalizados = existentes.filter((s) => s.tipo === 'personalizado').length;
  const sector: Sector = {
    id: newId(),
    nombre: datos.nombre,
    descripcion: datos.descripcion,
    tipo: 'personalizado',
    icono: null,
    color: PALETA_SECTORES[personalizados % PALETA_SECTORES.length],
    activo: 1,
    orden: Math.max(-1, ...existentes.map((s) => s.orden)) + 1,
    created_at: ahora,
    updated_at: ahora,
    deleted_at: null,
  };

  await db.runAsync(
    `INSERT INTO sectores
       (id, nombre, descripcion, tipo, icono, color, activo, orden, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sector.id,
      sector.nombre,
      sector.descripcion,
      sector.tipo,
      sector.icono,
      sector.color,
      sector.activo,
      sector.orden,
      sector.created_at,
      sector.updated_at,
    ],
  );

  return sector;
}