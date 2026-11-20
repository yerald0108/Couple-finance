import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fontSizes, fonts, radius, spacing } from '../../theme';
import { useAlEnfocar } from '../common/AlEnfocarContext';

interface TextFieldProps
  extends Pick<
    TextInputProps,
    | 'value'
    | 'onChangeText'
    | 'placeholder'
    | 'maxLength'
    | 'multiline'
    | 'autoCapitalize'
    | 'returnKeyType'
    | 'onSubmitEditing'
    | 'secureTextEntry'
    | 'keyboardType'
    | 'autoCorrect'
    | 'autoComplete'
    | 'textContentType'
  > {
  label: string;
  /** Mensaje de error (en rojo). Si no hay error se muestra `helper`. */
  error?: string;
  helper?: string;
}

/** Campo de texto con etiqueta, ayuda, error y contador de letras. */
export function TextField({ label, error, helper, multiline, maxLength, value, ...rest }: TextFieldProps) {
  const [enfocado, setEnfocado] = useState(false);
  const alEnfocar = useAlEnfocar();

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...rest}
        value={value}
        multiline={multiline}
        maxLength={maxLength}
        onFocus={() => {
          setEnfocado(true);
          alEnfocar();
        }}
        onBlur={() => setEnfocado(false)}
        placeholderTextColor={colors.textMuted}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          styles.input,
          multiline && styles.multiline,
          enfocado && styles.focused,
          error ? styles.errorBorder : null,
        ]}
      />
      <View style={styles.footer}>
        <Text style={[styles.helper, error ? styles.errorText : null]}>{error ?? helper ?? ''}</Text>
        {maxLength ? (
          <Text style={styles.counter}>
            {(value ?? '').length}/{maxLength}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  input: {
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.regular,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  multiline: {
    minHeight: 96,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  focused: {
    borderColor: colors.primary,
  },
  errorBorder: {
    borderColor: colors.negative,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  helper: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.negative,
  },
  counter: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
});