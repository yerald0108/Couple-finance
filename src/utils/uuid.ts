import * as Crypto from 'expo-crypto';

/**
 * Genera un identificador único (UUID v4) en el dispositivo.
 * Los IDs se crean en el cliente para que, más adelante (Fase 8), dos teléfonos
 * puedan crear registros sin conexión sin que sus IDs choquen.
 */
export function newId(): string {
  return Crypto.randomUUID();
}