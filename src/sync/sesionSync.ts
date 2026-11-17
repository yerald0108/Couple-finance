import type { ParejaInfo, UsuarioCuenta } from '../lib/cuentaService';
import type { SesionSync } from './motor';

/** Datos que necesita el motor de sincronización, a partir de la cuenta y la pareja. null = todavía no se puede sincronizar. */
export function sesionSyncDe(usuario: UsuarioCuenta | null, pareja: ParejaInfo | null): SesionSync | null {
  if (!usuario || !pareja) return null;
  return {
    usuarioId: usuario.id,
    parejaId: pareja.pareja_id,
    miembrosIds: pareja.miembros.map((m) => m.user_id),
  };
}

/** Texto que cambia solo cuando cambia la cuenta, la pareja o quiénes son sus miembros (para reaccionar solo a eso). */
export function claveSesionSync(usuario: UsuarioCuenta | null, pareja: ParejaInfo | null): string | null {
  const s = sesionSyncDe(usuario, pareja);
  if (!s) return null;
  return `${s.usuarioId}|${s.parejaId}|${[...s.miembrosIds].sort().join(',')}`;
}

/** "hace un momento", "hace 5 min", "hace 2 h" o la fecha corta si pasó más de un día. */
export function textoHace(iso: string | null, ahora: Date = new Date()): string {
  if (!iso) return 'todavía no';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 'todavía no';
  const seg = Math.max(0, Math.floor((ahora.getTime() - t) / 1000));
  if (seg < 45) return 'hace un momento';
  const min = Math.floor(seg / 60);
  if (min < 60) return `hace ${Math.max(1, min)} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
}