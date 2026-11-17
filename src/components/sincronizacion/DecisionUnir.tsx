import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { sesionStore } from '../../store/useSesionStore';
import { useSyncStore } from '../../store/useSyncStore';
import { sesionSyncDe } from '../../sync/sesionSync';
import { colors, fontSizes, fonts, spacing } from '../../theme';
import { confirmar } from '../../utils/dialogos';
import { mensajeError } from '../../utils/errors';
import { Button } from '../common/Button';
import { Card } from '../common/Card';

function plural(n: number, uno: string, varios: string) {
  return `${n} ${n === 1 ? uno : varios}`;
}

/** Pregunta que aparece solo cuando este teléfono y la pareja YA tienen movimientos: unirlos o empezar con los de la pareja. */
export function DecisionUnir() {
  const db = useSQLiteContext();
  const decision = useSyncStore((s) => s.decision);
  const decidir = useSyncStore((s) => s.decidir);
  const [trabajando, setTrabajando] = useState<'unir' | 'empezar' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!decision) return null;

  async function elegir(modo: 'unir' | 'empezar') {
    setError(null);
    const { usuario, pareja } = sesionStore.getState();
    const sesion = sesionSyncDe(usuario, pareja);
    if (!sesion) return;

    if (modo === 'empezar') {
      const si = await confirmar({
        titulo: 'Empezar con los de tu pareja',
        mensaje:
          `Se borrarán de este teléfono sus ${plural(decision!.locales, 'movimiento', 'movimientos')} ` +
          'y los sectores que creaste aquí, y se descargarán los de tu pareja. No se puede deshacer.',
        textoConfirmar: 'Borrar y empezar',
        destructivo: true,
      });
      if (!si) return;
    }

    setTrabajando(modo);
    try {
      await decidir(db, sesion, modo);
    } catch (e) {
      setError(mensajeError(e));
    }
    setTrabajando(null);
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.titulo}>¿Cómo unimos los movimientos?</Text>
      <Text style={styles.texto}>
        Este teléfono ya tiene {plural(decision.locales, 'movimiento', 'movimientos')} y tu pareja ya tiene{' '}
        {plural(decision.remotos, 'movimiento', 'movimientos')}.
      </Text>
      <Text style={styles.texto}>
        «Unir» deja los de los dos teléfonos juntos. «Empezar con los de mi pareja» borra los de este teléfono.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        title="Unir los movimientos"
        icon="git-merge"
        onPress={() => void elegir('unir')}
        loading={trabajando === 'unir'}
        disabled={trabajando !== null}
      />
      <Button
        title="Empezar con los de mi pareja"
        variant="danger"
        icon="download"
        onPress={() => void elegir('empezar')}
        loading={trabajando === 'empezar'}
        disabled={trabajando !== null}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
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
  error: {
    fontFamily: fonts.medium,
    fontSize: fontSizes.sm,
    color: colors.negative,
  },
});