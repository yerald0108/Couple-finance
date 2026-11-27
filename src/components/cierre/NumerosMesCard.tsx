import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fontSizes, fonts, spacing } from '../../theme';
import { useEstilos } from '../../theme/useTema';
import type { Tema } from '../../theme/temas';
import type { NumerosMes } from '../../utils/cierreMes';
import { formatMonto } from '../../utils/formatters';
import { Card } from '../common/Card';
import { Divider } from '../common/Divider';

interface NumerosMesCardProps {
  numeros: NumerosMes;
}

/** El mes en cuatro datos sueltos: cuántos gastos, el promedio, el día de más gasto y los días sin gastar. */
export function NumerosMesCard({ numeros }: NumerosMesCardProps) {
  const styles = useEstilos(crearEstilos);
  const filas: { id: string; nombre: string; valor: string }[] = [
    {
      id: 'cantidad',
      nombre: 'Gastos registrados',
      valor: String(numeros.cantidadGastos),
    },
  ];
  if (numeros.promedioPorGasto !== null) {
    filas.push({ id: 'promedio', nombre: 'Promedio por gasto (pesos)', valor: formatMonto(numeros.promedioPorGasto) });
  }
  if (numeros.diaMayorGasto) {
    filas.push({
      id: 'dia',
      nombre: 'Día de más gasto (pesos)',
      valor: `${numeros.diaMayorGasto.etiqueta} · ${formatMonto(numeros.diaMayorGasto.cup)}`,
    });
  }
  if (numeros.diasSinGasto !== null) {
    filas.push({
      id: 'sin',
      nombre: 'Días sin gastos en pesos',
      valor: String(numeros.diasSinGasto),
    });
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.titulo}>El mes en números</Text>
      {filas.map((fila, i) => (
        <Fragment key={fila.id}>
          {i > 0 ? <Divider /> : null}
          <View style={styles.fila}>
            <Text style={styles.nombre}>{fila.nombre}</Text>
            <Text style={styles.valor}>{fila.valor}</Text>
          </View>
        </Fragment>
      ))}
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.lg,
  },
  nombre: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  valor: {
    flex: 1,
    textAlign: 'right',
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
});