import { useCallback, type ReactNode } from 'react';
import { FlatList, StyleSheet, View, type ListRenderItemInfo } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../theme';
import { Divider } from './Divider';
import { EncabezadoPantalla } from './EncabezadoPantalla';

interface PantallaListaProps<T> {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** Lo que va antes de la lista (tarjetas, botones, el título de la sección). Se separa con el mismo aire que en `Screen`. */
  encabezado?: ReactNode;
  data: readonly T[];
  keyExtractor: (item: T) => string;
  /** El contenido de una fila, sin tarjeta ni separador: `PantallaLista` se los pone. */
  renderItem: (item: T) => ReactNode;
  /** Lo que se muestra si no hay filas (por ejemplo, un `EmptyState`). */
  vacio?: ReactNode;
  /** Lo que va después de la lista; solo se muestra si hay filas. */
  pie?: ReactNode;
}

/**
 * Pantalla con una lista larga, dibujada con `FlatList`: solo se crean las filas que se ven (más unas pocas
 * alrededor), así una lista de cientos de movimientos abre y se desplaza igual de rápido que una de diez.
 *
 * Se ve igual que una `Screen` con las filas dentro de una `Card`, salvo que las filas no llevan sombra: la sombra
 * de una tarjeta no se puede repartir entre filas que se crean y se destruyen al desplazarse.
 * No tiene teclado ni "tirar para actualizar": para pantallas con formularios sigue usándose `Screen`.
 */
export function PantallaLista<T>({
  title,
  subtitle,
  onBack,
  encabezado,
  data,
  keyExtractor,
  renderItem,
  vacio,
  pie,
}: PantallaListaProps<T>) {
  const total = data.length;

  const dibujar = useCallback(
    ({ item, index }: ListRenderItemInfo<T>) => (
      <FilaDeTarjeta primera={index === 0} ultima={index === total - 1}>
        {renderItem(item)}
      </FilaDeTarjeta>
    ),
    [renderItem, total],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={dibujar}
        ListHeaderComponent={
          <View style={[styles.bloque, styles.antes]}>
            <EncabezadoPantalla title={title} subtitle={subtitle} onBack={onBack} />
            {encabezado}
          </View>
        }
        ListEmptyComponent={vacio ? <View style={styles.bloque}>{vacio}</View> : undefined}
        ListFooterComponent={total > 0 && pie ? <View style={[styles.bloque, styles.despues]}>{pie}</View> : undefined}
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
        // Se dibujan pocas filas al abrir y unas pantallas de margen al desplazarse (el valor por defecto, 21, es mucho).
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}

interface FilaDeTarjetaProps {
  primera: boolean;
  ultima: boolean;
  children: ReactNode;
}

/** Una fila de la lista con el aspecto de una fila dentro de una tarjeta: fondo blanco, esquinas solo arriba y abajo. */
function FilaDeTarjeta({ primera, ultima, children }: FilaDeTarjetaProps) {
  return (
    <View style={[styles.fila, primera && styles.primera, ultima && styles.ultima]}>
      {primera ? null : <Divider />}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contenido: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  // Mismo aire entre bloques que en `Screen` (gap de `spacing.lg`).
  bloque: {
    gap: spacing.lg,
  },
  antes: {
    paddingBottom: spacing.lg,
  },
  despues: {
    paddingTop: spacing.lg,
  },
  fila: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  primera: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: 4,
  },
  ultima: {
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    paddingBottom: 4,
  },
});