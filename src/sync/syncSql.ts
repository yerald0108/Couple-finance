/**
 * SQL de la migración local v3 (Fase 8B): la "cola de cambios pendientes" y los disparadores que la llenan.
 * No importa nada de Expo a propósito: el mismo SQL se prueba fuera del teléfono.
 *
 * Cómo funciona:
 *  - `sync_cola`: una fila por cada registro (sector, movimiento o reparto) que cambió y todavía no se subió.
 *    `seq` sube con cada cambio: si un registro cambia DURANTE una subida, su `seq` nuevo no coincide con el
 *    que se subió y el registro se queda en la cola para la próxima vez.
 *  - `sync_aplicando`: marca (por registro) los cambios que vienen de la pareja, para que no se vuelvan a
 *    subir como si fueran locales.
 *  - Los disparadores solo trabajan si la sincronización está activada (ajuste `sync_activo` = '1'), así que
 *    mientras no uses la sincronización la app se comporta exactamente igual que antes.
 *  - Los disparadores no cambian ninguna función de las fases 1 a 7: registrar, editar y eliminar siguen
 *    escribiendo igual y la base se encarga de anotar el pendiente.
 */

const SYNC_ACTIVO = `(SELECT valor FROM ajustes WHERE clave = 'sync_activo') = '1'`;

function disparadorCola(tabla: string, evento: 'INSERT' | 'UPDATE'): string {
  const nombre = `sync_${tabla}_${evento === 'INSERT' ? 'ins' : 'upd'}`;
  return `
CREATE TRIGGER ${nombre} AFTER ${evento} ON ${tabla}
WHEN ${SYNC_ACTIVO}
 AND NOT EXISTS (SELECT 1 FROM sync_aplicando WHERE tabla = '${tabla}' AND fila_id = NEW.id)
BEGIN
  INSERT OR REPLACE INTO sync_cola (tabla, fila_id, seq)
  VALUES ('${tabla}', NEW.id, COALESCE((SELECT MAX(seq) FROM sync_cola), 0) + 1);
END;`;
}

export const SCHEMA_V3 = `
CREATE TABLE sync_cola (
  tabla   TEXT NOT NULL CHECK (tabla IN ('sectores','movimientos','repartos')),
  fila_id TEXT NOT NULL,
  seq     INTEGER NOT NULL,
  PRIMARY KEY (tabla, fila_id)
);
CREATE INDEX idx_sync_cola_seq ON sync_cola(seq);

CREATE TABLE sync_aplicando (
  tabla   TEXT NOT NULL,
  fila_id TEXT NOT NULL,
  PRIMARY KEY (tabla, fila_id)
);
${disparadorCola('sectores', 'INSERT')}
${disparadorCola('sectores', 'UPDATE')}
${disparadorCola('movimientos', 'INSERT')}
${disparadorCola('movimientos', 'UPDATE')}
${disparadorCola('repartos', 'INSERT')}
${disparadorCola('repartos', 'UPDATE')}

-- Un movimiento nuevo registrado en este teléfono queda a nombre de la cuenta de la sesión.
CREATE TRIGGER sync_movimientos_autor AFTER INSERT ON movimientos
WHEN NEW.registrado_por IS NULL
 AND ${SYNC_ACTIVO}
 AND (SELECT valor FROM ajustes WHERE clave = 'sync_usuario_id') IS NOT NULL
 AND NOT EXISTS (SELECT 1 FROM sync_aplicando WHERE tabla = 'movimientos' AND fila_id = NEW.id)
BEGIN
  UPDATE movimientos
     SET registrado_por = (SELECT valor FROM ajustes WHERE clave = 'sync_usuario_id')
   WHERE id = NEW.id;
END;
`;