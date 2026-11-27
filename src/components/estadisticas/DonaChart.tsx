import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTema } from '../../theme/useTema';

export interface SegmentoDona {
  id: string;
  color: string;
  /** Tamaño del segmento (pesos). Los que valen 0 no se dibujan. */
  valor: number;
}

interface DonaChartProps {
  segmentos: SegmentoDona[];
  /** Segmento resaltado (los demás se atenúan). */
  seleccionadoId: string | null;
  onSeleccionar: (id: string | null) => void;
  /** Se dibuja en el centro (texto con el total o con lo seleccionado). */
  children?: ReactNode;
  tamano?: number;
}

const GROSOR = 24;
const GROSOR_SELECCIONADO = 30;
/** Espacio entre segmentos (en unidades de longitud de la circunferencia). */
const HUECO = 3;

/** Dona dibujada con react-native-svg: un círculo con borde por cada segmento. */
export function DonaChart({
  segmentos,
  seleccionadoId,
  onSeleccionar,
  children,
  tamano = 190,
}: DonaChartProps) {
  const { colors } = useTema();
  const visibles = segmentos.filter((s) => s.valor > 0);
  const total = visibles.reduce((suma, s) => suma + s.valor, 0);

  const centro = tamano / 2;
  const radio = (tamano - GROSOR_SELECCIONADO) / 2;
  const circunferencia = 2 * Math.PI * radio;

  let acumulado = 0;
  const arcos = visibles.map((s) => {
    const largo = (s.valor / total) * circunferencia;
    const hueco = visibles.length > 1 ? HUECO : 0;
    const trazo = Math.max(largo - hueco, Math.min(largo, 1));
    const inicio = acumulado;
    acumulado += largo;
    return { ...s, trazo, inicio };
  });

  return (
    <View style={[styles.contenedor, { width: tamano, height: tamano }]}>
      <Svg width={tamano} height={tamano}>
        {/* Pista gris de fondo (se ve completa si no hay segmentos). */}
        <Circle
          cx={centro}
          cy={centro}
          r={radio}
          stroke={colors.background}
          strokeWidth={GROSOR}
          fill="none"
        />
        {/* Los segmentos empiezan arriba (las 12 en punto) y van en el sentido del reloj. */}
        <G rotation={-90} origin={`${centro}, ${centro}`}>
          {arcos.map((arco) => {
            const elegido = arco.id === seleccionadoId;
            const atenuado = seleccionadoId !== null && !elegido;
            return (
              <Circle
                key={arco.id}
                cx={centro}
                cy={centro}
                r={radio}
                stroke={arco.color}
                strokeWidth={elegido ? GROSOR_SELECCIONADO : GROSOR}
                strokeOpacity={atenuado ? 0.3 : 1}
                strokeDasharray={`${arco.trazo} ${circunferencia - arco.trazo}`}
                strokeDashoffset={-arco.inicio}
                fill="none"
                onPress={() => onSeleccionar(elegido ? null : arco.id)}
              />
            );
          })}
        </G>
      </Svg>
      <View style={styles.centro} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centro: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 44,
  },
});