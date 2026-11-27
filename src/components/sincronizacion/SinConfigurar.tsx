import { StyleSheet, Text } from 'react-native';
import { Card } from '../common/Card';
import { fontSizes, fonts, spacing } from '../../theme';
import { useEstilos } from '../../theme/useTema';
import type { Tema } from '../../theme/temas';

/** Se muestra si la app todavía no tiene la dirección y la llave de Supabase. */
export function SinConfigurar() {
  const styles = useEstilos(crearEstilos);
  return (
    <Card style={styles.card}>
      <Text style={styles.titulo}>Falta conectar Supabase</Text>
      <Text style={styles.texto}>
        La app sigue funcionando normal, solo en este teléfono. Para sincronizar con tu pareja hay que
        conectar un proyecto de Supabase:
      </Text>
      <Text style={styles.paso}>1. Crea el archivo .env junto a package.json (copia .env.example).</Text>
      <Text style={styles.paso}>2. Escribe la dirección del proyecto y la llave pública (publishable key).</Text>
      <Text style={styles.paso}>3. Cierra Expo y vuelve a abrirlo con: npx expo start -c</Text>
      <Text style={styles.texto}>
        Para el APK, esas mismas dos variables se agregan en tu proyecto de expo.dev (Environment variables).
      </Text>
    </Card>
  );
}

const crearEstilos = ({ colors }: Tema) => StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  titulo: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.lg,
    color: colors.text,
  },
  texto: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  paso: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.text,
    lineHeight: 20,
  },
});