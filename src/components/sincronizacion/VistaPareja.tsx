import { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import type { ParejaInfo } from '../../lib/cuentaService';
import { useSesionStore } from '../../store/useSesionStore';
import { useSyncStore } from '../../store/useSyncStore';
import { colors, fontSizes, fonts, radius, spacing } from '../../theme';
import {
  NOMBRE_PAREJA_MAX,
  formatearCodigo,
  validarNombrePareja,
} from '../../utils/cuentaValidation';
import { mensajeError } from '../../utils/errors';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Divider } from '../common/Divider';
import { TextField } from '../forms/TextField';
import { CerrarSesionBoton } from './CerrarSesionBoton';
import { DecisionUnir } from './DecisionUnir';
import { EstadoSincronizacion } from './EstadoSincronizacion';

interface VistaParejaProps {
  pareja: ParejaInfo;
}

/** Pareja ya creada: código (mientras falte la otra persona), miembros, cambiar mi nombre y cerrar sesión. */
export function VistaPareja({ pareja }: VistaParejaProps) {
  const db = useSQLiteContext();
  const refrescar = useSesionStore((s) => s.refrescar);
  const cambiarNombre = useSesionStore((s) => s.cambiarNombre);

  const estadoSync = useSyncStore((s) => s.estado);
  const completa = pareja.miembros.length >= 2;
  const yo = pareja.miembros.find((m) => m.soy_yo);

  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(yo?.nombre ?? '');
  const [guardando, setGuardando] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vNombre = validarNombrePareja(nombre);

  async function guardarNombre() {
    setError(null);
    if (!vNombre.valido) return;
    setGuardando(true);
    try {
      await cambiarNombre(db, vNombre.valor);
      setEditando(false);
    } catch (e) {
      setError(mensajeError(e));
    }
    setGuardando(false);
  }

  async function actualizar() {
    setActualizando(true);
    await refrescar(db);
    setActualizando(false);
  }

  async function compartir() {
    try {
      await Share.share({
        message: `Únete a mi pareja en CoupleFinance con este código: ${formatearCodigo(pareja.codigo)}`,
      });
    } catch {
      // Cerrar la hoja de compartir sin enviar no es un error.
    }
  }

  return (
    <View style={styles.wrap}>
      {estadoSync === 'decidir' ? <DecisionUnir /> : null}

      {completa ? (
        <Card style={styles.card}>
          <Text style={styles.titulo}>Pareja conectada</Text>
          <Text style={styles.texto}>
            Ya son dos cuentas. Lo que registre cualquiera de los dos se envía al otro teléfono cuando hay internet.
          </Text>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Text style={styles.titulo}>Código de tu pareja</Text>
          <Text style={styles.codigo} accessibilityLabel={`Código ${pareja.codigo.split('').join(' ')}`}>
            {formatearCodigo(pareja.codigo)}
          </Text>
          <Text style={styles.texto}>
            Pásaselo a tu pareja. En su teléfono debe crear su cuenta y elegir «Tengo un código».
          </Text>
          <Button title="Compartir código" icon="share-social" onPress={compartir} />
          <Button title="Ya se unió, actualizar" variant="secondary" icon="refresh" onPress={actualizar} loading={actualizando} />
        </Card>
      )}

      {estadoSync !== 'decidir' && estadoSync !== 'inactivo' ? <EstadoSincronizacion /> : null}

      <Card style={styles.card}>
        <Text style={styles.titulo}>Miembros</Text>
        {pareja.miembros.map((m, i) => (
          <View key={m.user_id}>
            {i > 0 ? <Divider /> : null}
            <View style={styles.fila}>
              <View style={[styles.avatar, m.soy_yo && styles.avatarYo]}>
                <Text style={[styles.inicial, m.soy_yo && styles.inicialYo]}>
                  {Array.from(m.nombre)[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <Text style={styles.nombre}>{m.nombre}</Text>
              {m.soy_yo ? <Text style={styles.tu}>tú</Text> : null}
            </View>
          </View>
        ))}
        {!completa ? <Text style={styles.texto}>Esperando a tu pareja…</Text> : null}

        {editando ? (
          <View style={styles.editar}>
            <TextField
              label="Tu nombre"
              value={nombre}
              onChangeText={setNombre}
              maxLength={NOMBRE_PAREJA_MAX}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={guardarNombre}
              error={error ?? (vNombre.valido ? undefined : vNombre.error)}
            />
            <Button title="Guardar nombre" icon="checkmark" onPress={guardarNombre} loading={guardando} />
            <Button
              title="Cancelar"
              variant="secondary"
              onPress={() => {
                setEditando(false);
                setNombre(yo?.nombre ?? '');
                setError(null);
              }}
            />
          </View>
        ) : (
          <Button
            title="Cambiar mi nombre"
            variant="secondary"
            icon="create"
            onPress={() => {
              setNombre(yo?.nombre ?? '');
              setEditando(true);
            }}
          />
        )}
      </Card>

      <CerrarSesionBoton />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.lg,
  },
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
  codigo: {
    fontFamily: fonts.bold,
    fontSize: 36,
    letterSpacing: 4,
    color: colors.primary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarYo: {
    backgroundColor: colors.primarySoft,
  },
  inicial: {
    fontFamily: fonts.bold,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  inicialYo: {
    color: colors.primary,
  },
  nombre: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  tu: {
    fontFamily: fonts.medium,
    fontSize: fontSizes.xs,
    color: colors.primary,
  },
  editar: {
    gap: spacing.md,
  },
});