import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fontSizes, fonts, radius, spacing } from '../../theme';
import type { Moneda } from '../../types';
import { simboloMoneda } from '../../utils/formatters';
import { limpiarMontoTexto } from '../../utils/montos';
import { useAlEnfocar } from '../common/AlEnfocarContext';

interface MontoInputProps {
  value: string;
  onChangeText: (texto: string) => void;
  moneda: Moneda;
  label?: string;
  placeholder?: string;
  error?: string;
  helper?: string;
  /** Versión pequeña para filas de lista (sin etiqueta ni mensajes). */
  compacto?: boolean;
  accessibilityLabel?: string;
}

/**
 * Campo de monto: teclado numérico, símbolo de la moneda y limpieza automática
 * (solo dígitos y un punto decimal, máximo 2 decimales; la coma se cambia por punto).
 */
export function MontoInput({
  value,
  onChangeText,
  moneda,
  label,
  placeholder = '0.00',
  error,
  helper,
  compacto = false,
  accessibilityLabel,
}: MontoInputProps) {
  const [enfocado, setEnfocado] = useState(false);
  const alEnfocar = useAlEnfocar();

  return (
    <View style={compacto ? styles.wrapCompacto : styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.caja,
          compacto && styles.cajaCompacta,
          enfocado && styles.focused,
          error ? styles.errorBorder : null,
        ]}
      >
        <Text style={[styles.simbolo, compacto && styles.simboloCompacto]}>
          {simboloMoneda(moneda)}
        </Text>
        <TextInput
          value={value}
          onChangeText={(texto) => onChangeText(limpiarMontoTexto(texto))}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          onFocus={() => {
            setEnfocado(true);
            alEnfocar();
          }}
          onBlur={() => setEnfocado(false)}
          accessibilityLabel={accessibilityLabel ?? label}
          style={[styles.input, compacto && styles.inputCompacto]}
        />
      </View>
      {!compacto && (error || helper) ? (
        <Text style={[styles.mensaje, error ? styles.mensajeError : null]}>{error ?? helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  wrapCompacto: {
    width: 132,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  caja: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  cajaCompacta: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  focused: {
    borderColor: colors.primary,
  },
  errorBorder: {
    borderColor: colors.negative,
  },
  simbolo: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.xl,
    color: colors.textSecondary,
  },
  simboloCompacto: {
    fontSize: fontSizes.sm,
  },
  input: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: fontSizes.xxl,
    color: colors.text,
    paddingVertical: 0,
  },
  inputCompacto: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.md,
  },
  mensaje: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  mensajeError: {
    color: colors.negative,
  },
});