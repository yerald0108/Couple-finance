import { useRef, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useCuentasStore } from '../store/useCuentasStore';
import { confirmar } from '../utils/dialogos';
import { mensajeError } from '../utils/errors';

interface TextosEliminar {
  titulo: string;
  mensaje: string;
}

/**
 * Flujo completo para eliminar un movimiento: pregunta si está seguro y elimina. Si eliminarlo dejaría
 * algún saldo en negativo (un ingreso cuyo dinero ya se gastó), no lo elimina y deja el motivo en `error`.
 * Llama a `alTerminar` solo cuando el movimiento quedó eliminado.
 */
export function useEliminarMovimiento(
  movimientoId: string | undefined,
  textos: TextosEliminar,
  alTerminar: () => void,
) {
  const db = useSQLiteContext();
  const eliminarMovimiento = useCuentasStore((s) => s.eliminarMovimiento);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bloqueo = useRef(false); // evita eliminar dos veces si se toca el botón rápido

  async function eliminar() {
    if (bloqueo.current || !movimientoId) return;
    bloqueo.current = true;
    setError(null);
    try {
      const seguro = await confirmar({
        titulo: textos.titulo,
        mensaje: textos.mensaje,
        textoConfirmar: 'Eliminar',
        destructivo: true,
      });
      if (!seguro) return;

      setEliminando(true);
      const resultado = await eliminarMovimiento(db, movimientoId);
      if (resultado.estado === 'guardado') {
        alTerminar();
        return;
      }
      // Ya se gastó parte de ese dinero: no se puede eliminar sin dejar un saldo en negativo.
      setError(resultado.avisos.join('\n'));
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      bloqueo.current = false;
      setEliminando(false);
    }
  }

  return { eliminar, eliminando, error };
}