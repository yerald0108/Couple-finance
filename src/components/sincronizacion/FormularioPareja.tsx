import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useSesionStore } from '../../store/useSesionStore';
import { colors, fontSizes, fonts, spacing } from '../../theme';
import {
  CODIGO_LARGO,
  NOMBRE_PAREJA_MAX,
  validarCodigo,
  validarNombrePareja,
} from '../../utils/cuentaValidation';
import { mensajeError } from '../../utils/errors';
import { Button } from '../common/Button';
import { OpcionesSelector, type Opcion } from '../forms/OpcionesSelector';
import { TextField } from '../forms/TextField';
import { CerrarSesionBoton } from './CerrarSesionBoton';

type Modo = 'crear' | 'unir';

const OPCIONES: Opcion<Modo>[] = [
  { value: 'crear', label: 'Crear pareja', icon: 'heart' },
  { value: 'unir', label: 'Tengo un código', icon: 'key' },
];

/** Cuenta ya iniciada, pero sin pareja: crearla (y recibir un código) o unirse con el código de la otra persona. */
export function FormularioPareja() {
  const db = useSQLiteContext();
  const email = useSesionStore((s) => s.usuario?.email ?? null);
  const crearPareja = useSesionStore((s) => s.crearPareja);
  const unirPareja = useSesionStore((s) => s.unirPareja);

  const [modo, setModo] = useState<Modo>('crear');
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const vNombre = validarNombrePareja(nombre);
  const vCodigo = validarCodigo(codigo);
  const valido = vNombre.valido && (modo === 'crear' || vCodigo.valido);

  async function enviar() {
    setIntentado(true);
    setErrorEnvio(null);
    if (!valido) return;
    setEnviando(true);
    try {
      if (modo === 'crear') await crearPareja(db, vNombre.valor);
      else await unirPareja(db, vCodigo.valor, vNombre.valor);
    } catch (e) {
      setErrorEnvio(mensajeError(e));
      setEnviando(false);
    }
  }

  return (
    <View style={styles.form}>
      <Text style={styles.cuenta}>Cuenta: {email ?? 'sin correo'}</Text>
      <Text style={styles.intro}>
        Una de las dos personas crea la pareja y le pasa el código a la otra, que elige «Tengo un código».
        Solo pueden ser dos cuentas.
      </Text>

      <OpcionesSelector
        label="¿Qué quieres hacer?"
        opciones={OPCIONES}
        valor={modo}
        columnas={2}
        onChange={(m) => {
          setModo(m);
          setIntentado(false);
          setErrorEnvio(null);
        }}
      />

      <TextField
        label="Tu nombre"
        placeholder="Ej. Yerald"
        helper="Así te verá tu pareja en los movimientos que registres."
        value={nombre}
        onChangeText={setNombre}
        maxLength={NOMBRE_PAREJA_MAX}
        autoCapitalize="words"
        returnKeyType={modo === 'crear' ? 'done' : 'next'}
        onSubmitEditing={modo === 'crear' ? enviar : undefined}
        error={intentado ? vNombre.error : undefined}
      />

      {modo === 'unir' ? (
        <TextField
          label="Código de tu pareja"
          placeholder="ABCD-EFGH"
          value={codigo}
          onChangeText={setCodigo}
          maxLength={CODIGO_LARGO + 3}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={enviar}
          error={intentado ? vCodigo.error : undefined}
        />
      ) : null}

      {errorEnvio ? <Text style={styles.error}>{errorEnvio}</Text> : null}

      <Button
        title={modo === 'crear' ? 'Crear pareja' : 'Unirme a mi pareja'}
        icon={modo === 'crear' ? 'heart' : 'link'}
        onPress={enviar}
        loading={enviando}
      />

      <CerrarSesionBoton />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  cuenta: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  intro: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.negative,
  },
});