/** Convierte cualquier error capturado en un texto legible. */
export function mensajeError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}