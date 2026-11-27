import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ModoTema } from '../theme/temas';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface OpcionTema {
  value: ModoTema;
  label: string;
  descripcion: string;
  icono: IconName;
}

/** Las tres formas de ver la app, en el orden en que se muestran. */
export const OPCIONES_TEMA: OpcionTema[] = [
  { value: 'claro', label: 'Claro', descripcion: 'Fondo claro, como siempre.', icono: 'sunny-outline' },
  { value: 'oscuro', label: 'Oscuro', descripcion: 'Fondo oscuro, más cómodo de noche.', icono: 'moon-outline' },
  {
    value: 'automatico',
    label: 'Automático',
    descripcion: 'Sigue el modo que tenga tu teléfono.',
    icono: 'phone-portrait-outline',
  },
];

/** El icono del botón de Inicio: muestra el modo elegido. */
export function iconoDeModo(modo: ModoTema): IconName {
  return OPCIONES_TEMA.find((o) => o.value === modo)?.icono ?? 'sunny-outline';
}

/** Lo que lee el lector de pantalla en el botón de Inicio. */
export function etiquetaBotonTema(modo: ModoTema): string {
  const nombre = OPCIONES_TEMA.find((o) => o.value === modo)?.label ?? 'Claro';
  return `Apariencia: ${nombre}`;
}