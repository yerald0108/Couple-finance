import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Dimensions,
  Keyboard,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  type ScrollViewInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { colors, spacing } from '../../theme';
import { desplazamientoParaVer, solapeConTeclado } from '../../utils/teclado';
import { AlEnfocarContext } from './AlEnfocarContext';
import { EncabezadoPantalla } from './EncabezadoPantalla';

/** Aire que se deja entre el campo enfocado y el teclado. */
const MARGEN_CAMPO = 24;

interface ScreenProps {
  title: string;
  subtitle?: string;
  /** Si se pasa, se muestra un botón "atrás" junto al título. */
  onBack?: () => void;
  /** Si se pasa, se muestra a la derecha del título (por ejemplo, un botón de la barra superior). */
  derecha?: ReactNode;
  /**
   * Si se pasa, al tirar de la pantalla hacia abajo se muestra el indicador de "actualizando" mientras
   * esta función no termina. Debe manejar sus propios errores.
   */
  onRefresh?: () => Promise<void>;
  children?: ReactNode;
}

/** Contenedor base de cada pantalla: respeta la barra superior, título y scroll. */
export function Screen({ title, subtitle, onBack, derecha, onRefresh, children }: ScreenProps) {
  const alturaTeclado = useKeyboardHeight();
  const [refrescando, setRefrescando] = useState(false);

  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollY = useRef(0);
  const alturaRef = useRef(0);
  alturaRef.current = alturaTeclado;
  const pendiente = useRef<(() => void) | null>(null);
  // Cuánto del final del scroll queda realmente debajo del teclado (lo mide `ajustarAlTeclado`).
  const [solape, setSolape] = useState(0);

  // Con el teclado abierto: (1) mide cuánto tapa el final del scroll y deja ese espacio al final del contenido
  // y (2) desplaza lo justo para que el campo enfocado quede completo, por encima del teclado.
  // Si el teléfono ya achicó la ventana (y la barra de pestañas se ocultó), el solape es 0 y no sobra hueco.
  const ajustarAlTeclado = useCallback(() => {
    const scroll = scrollRef.current;
    if (!scroll || alturaRef.current === 0) return;
    scroll.measureInWindow((_sx, sy, _sw, sh) => {
      const tecladoArriba =
        Keyboard.metrics()?.screenY ?? Dimensions.get('window').height - alturaRef.current;
      setSolape(solapeConTeclado(sy + sh, tecladoArriba));

      const campo = TextInput.State.currentlyFocusedInput();
      if (!campo) return;
      campo.measureInWindow((_x, y, _w, h) => {
        const delta = desplazamientoParaVer({
          campoArriba: y,
          campoAbajo: y + h,
          visibleArriba: sy,
          visibleAbajo: Math.min(sy + sh, tecladoArriba),
          margen: MARGEN_CAMPO,
        });
        if (delta !== 0) scroll.scrollTo({ y: Math.max(0, scrollY.current + delta), animated: true });
      });
    });
  }, []);

  // Se repite unas veces porque el teclado, el cambio de tamaño de la ventana y el ocultarse la barra de pestañas
  // terminan en momentos distintos; cada pasada es inofensiva si ya está todo en su sitio.
  const programarAjuste = useCallback(() => {
    pendiente.current?.();
    const ids = [60, 260, 520].map((ms) => setTimeout(ajustarAlTeclado, ms));
    pendiente.current = () => ids.forEach(clearTimeout);
  }, [ajustarAlTeclado]);

  // Al abrirse (o cambiar de tamaño) el teclado: ajustar. Al cerrarse: ya no hay nada que dejar de espacio.
  useEffect(() => {
    if (alturaTeclado > 0) programarAjuste();
    else setSolape(0);
  }, [alturaTeclado, programarAjuste]);

  useEffect(() => () => pendiente.current?.(), []);

  // Al pasar de un campo a otro con el teclado ya abierto no hay evento de teclado: lo avisa el propio campo.
  const alEnfocar = useCallback(() => {
    if (alturaRef.current > 0) programarAjuste();
  }, [programarAjuste]);

  async function refrescar() {
    if (!onRefresh || refrescando) return;
    setRefrescando(true);
    try {
      await onRefresh();
    } catch {
      // quien pasa `onRefresh` avisa de sus errores; aquí solo se detiene el indicador
    } finally {
      setRefrescando(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AlEnfocarContext.Provider value={alEnfocar}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + solape }]}
          showsVerticalScrollIndicator={false}
          // Con el teclado abierto, un toque en un botón funciona al primer intento.
          keyboardShouldPersistTaps="handled"
          // Desplazarse no cierra el teclado (así se puede bajar hasta el último campo mientras se escribe).
          keyboardDismissMode="none"
          onScroll={(e) => {
            scrollY.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          // Si cambia el tamaño de la zona (se oculta la barra de pestañas, se achica la ventana), se vuelve a ajustar.
          onLayout={alEnfocar}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refrescando}
                onRefresh={refrescar}
                tintColor={colors.primary}
                colors={[colors.primary]}
                progressBackgroundColor={colors.surface}
              />
            ) : undefined
          }
        >
          <EncabezadoPantalla title={title} subtitle={subtitle} onBack={onBack} derecha={derecha} />
          {children}
        </ScrollView>
      </AlEnfocarContext.Provider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
});