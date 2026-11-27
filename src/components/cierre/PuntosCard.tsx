import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fontSizes, fonts, spacing } from '../../theme';
import { useEstilos, useTema } from '../../theme/useTema';
import type { Tema } from '../../theme/temas';
import type { Insight } from '../../utils/analisis';
import { Card } from '../common/Card';
import { Divider } from '../common/Divider';

interface PuntosCardProps {
  puntos: Insight[];
}

/** Cosas que llaman la atención del mes, para hablarlas en pareja (los mismos avisos que muestra Estadísticas). */
export function PuntosCard({ puntos }: PuntosCardProps) {
  const styles = useEstilos(crearEstilos);
  const { colors } = useTema();
  return (
    <Card style={styles.card}>
      <Text style={styles.titulo}>Para comentar juntos</Text>
      {puntos.map((punto, i) => {
        const alerta = punto.tono === 'alerta';
        return (
          <Fragment key={punto.id}>
            {i > 0 ? <Divider /> : null}
            <View style={styles.fila}>
              <Ionicons
                name={alerta ? 'alert-circle' : 'information-circle'}
                size={22}
                color={alerta ? colors.warning : colors.primaryText}
              />
              <Text style={styles.texto}>{punto.texto}</Text>
            </View>
          </Fragment>
        );
      })}
    </Card>
  );
}

const crearEstilos = ({ colors }: Tema) => StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  titulo: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  texto: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    lineHeight: 22,
    color: colors.text,
  },
});