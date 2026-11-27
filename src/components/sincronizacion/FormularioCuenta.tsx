import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useSesionStore } from '../../store/useSesionStore';
import { fontSizes, fonts, spacing } from '../../theme';
import { useEstilos } from '../../theme/useTema';
import type { Tema } from '../../theme/temas';
import {
  validarEmail,
  validarPasswordEntrada,
  validarPasswordNueva,
  validarRepetirPassword,
} from '../../utils/cuentaValidation';
import { mensajeError } from '../../utils/errors';
import { Button } from '../common/Button';
import { OpcionesSelector, type Opcion } from '../forms/OpcionesSelector';
import { TextField } from '../forms/TextField';

type Modo = 'entrar' | 'crear';

const OPCIONES: Opcion<Modo>[] = [
  { value: 'entrar', label: 'Entrar', icon: 'log-in' },
  { value: 'crear', label: 'Crear cuenta', icon: 'person-add' },
];

/** Entrar o crear la cuenta de esta persona (correo + contraseña). */
export function FormularioCuenta() {
  const styles = useEstilos(crearEstilos);
  const db = useSQLiteContext();
  const registrarse = useSesionStore((s) => s.registrarse);
  const entrar = useSesionStore((s) => s.entrar);

  const [modo, setModo] = useState<Modo>('crear');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repetir, setRepetir] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const vEmail = validarEmail(email);
  const vPassword = modo === 'crear' ? validarPasswordNueva(password) : validarPasswordEntrada(password);
  const vRepetir = validarRepetirPassword(password, repetir);
  const valido = vEmail.valido && vPassword.valido && (modo === 'entrar' || vRepetir.valido);

  async function enviar() {
    setIntentado(true);
    setErrorEnvio(null);
    if (!valido) return;
    setEnviando(true);
    try {
      if (modo === 'crear') await registrarse(db, vEmail.valor, password);
      else await entrar(db, vEmail.valor, password);
    } catch (e) {
      setErrorEnvio(mensajeError(e));
      setEnviando(false);
    }
  }

  return (
    <View style={styles.form}>
      <Text style={styles.intro}>
        Cada persona tiene su propia cuenta. Sirve solo para que los dos teléfonos compartan los mismos
        movimientos; tus datos siguen guardados en este teléfono.
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
        label="Correo"
        placeholder="tucorreo@ejemplo.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        error={intentado ? vEmail.error : undefined}
      />

      <TextField
        label="Contraseña"
        placeholder={modo === 'crear' ? 'Mínimo 8 caracteres' : 'Tu contraseña'}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={modo === 'crear' ? 'new-password' : 'current-password'}
        textContentType={modo === 'crear' ? 'newPassword' : 'password'}
        returnKeyType={modo === 'crear' ? 'next' : 'done'}
        onSubmitEditing={modo === 'entrar' ? enviar : undefined}
        error={intentado ? vPassword.error : undefined}
      />

      {modo === 'crear' ? (
        <TextField
          label="Repite la contraseña"
          value={repetir}
          onChangeText={setRepetir}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={enviar}
          error={intentado ? vRepetir.error : undefined}
        />
      ) : null}

      {errorEnvio ? <Text style={styles.error}>{errorEnvio}</Text> : null}

      <Button
        title={modo === 'crear' ? 'Crear cuenta' : 'Entrar'}
        icon={modo === 'crear' ? 'person-add' : 'log-in'}
        onPress={enviar}
        loading={enviando}
      />
    </View>
  );
}

const crearEstilos = ({ colors }: Tema) => StyleSheet.create({
  form: {
    gap: spacing.lg,
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