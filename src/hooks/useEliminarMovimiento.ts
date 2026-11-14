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
 * Flujo completo para eliminar un movimiento: pregunta si está seguro, elimina y, si el cambio dejaría
 * algún saldo en negativo, enseña el aviso y pide una segunda confirmación.
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
      const primero = await eliminarMovimiento(db, movimientoId);
      if (primero.estado === 'guardado') {
        alTerminar();
        return;
      }

      const deTodosModos = await confirmar({
        titulo: 'Ojo con este cambio',
        mensaje: `${primero.avisos.join('\n\n')}\n\n¿Quieres eliminarlo de todos modos?`,
        textoConfirmar: 'Eliminar de todos modos',
        destructivo: true,
      });
      if (!deTodosModos) return;

      const segundo = await eliminarMovimiento(db, movimientoId, { confirmarExceso: true });
      if (segundo.estado === 'guardado') alTerminar();
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      bloqueo.current = false;
      setEliminando(false);
    }
  }

  return { eliminar, eliminando, error };
}