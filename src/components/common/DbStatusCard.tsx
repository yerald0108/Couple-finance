import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, fonts, spacing } from '../../theme';
import { Card } from './Card';

interface DbInfo {
  version: number;
  tablas: number;
  sectores: number;
  cuentas: number;
}

/**
 * TEMPORAL (Fase 1): comprueba en el teléfono que la base local se creó bien.
 * Se retira cuando Inicio y Billetera muestren datos reales (Fases 2 y 4).
 */
export function DbStatusCard() {
  const db = useSQLiteContext();
  const [info, setInfo] = useState<DbInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await db.getFirstAsync<DbInfo>(
          `SELECT
             (SELECT user_version FROM pragma_user_version) AS version,
             (SELECT COUNT(*) FROM sqlite_master
                WHERE type = 'table'
                  AND name IN ('sectores','cuentas','ajustes','movimientos','repartos')) AS tablas,
             (SELECT COUNT(*) FROM sectores) AS sectores,
             (SELECT COUNT(*) FROM cuentas) AS cuentas`,
        );
        if (!cancelled) setInfo(row);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db]);

  const ok = info !== null && info.tablas === 5;

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Ionicons
          name={error ? 'alert-circle' : ok ? 'checkmark-circle' : 'time-outline'}
          size={22}
          color={error ? colors.negative : ok ? colors.positive : colors.textMuted}
        />
        <Text style={styles.title}>Base de datos local</Text>
      </View>
      {error ? (
        <Text style={styles.error}>Error: {error}</Text>
      ) : info ? (
        <Text style={styles.detail}>
          Lista · versión {info.version} · {info.tablas} tablas · {info.sectores} sectores ·{' '}
          {info.cuentas} cuentas
        </Text>
      ) : (
        <Text style={styles.detail}>Comprobando…</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  detail: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.negative,
  },
});