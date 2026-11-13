import { formaColors } from '../../theme';
import { formaIconos } from '../../theme/iconos';
import type { FormaDinero } from '../../types';
import { FORMA_LABEL } from '../../utils/constants';
import type { Opcion } from './OpcionesSelector';

/** Las 3 formas de dinero como opciones para el selector (icono y color de cada una). */
export const OPCIONES_FORMA: Opcion<FormaDinero>[] = (['efectivo', 'transferencia', 'usd'] as const).map(
  (forma) => ({
    value: forma,
    label: FORMA_LABEL[forma],
    icon: formaIconos[forma],
    color: formaColors[forma],
  }),
);