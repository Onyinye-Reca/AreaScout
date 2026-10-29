import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { Button, Field, Header } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { colors, font, space } from '../../lib/theme';

/** Step 1: ask for an emailed code. Step 2: enter it with a new password. */
export default function ForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function sendCode() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError('Enter a valid email address'); return; }
    setBusy(true); setError('');
    try { await api('/auth/forgot-password', { method: 'POST', body: { email: email.trim().toLowerCase() } }); setStep('code'); }
    catch (e) { setError(errorMessage(e)); }
    setBusy(false);
  }

  async function reset() {
    setBusy(true); setError('');
    try {
      await api('/auth/reset-password', { method: 'POST', body: { email: email.trim().toLowerCase(), code: code.trim(), new_password: password } });
      Alert.alert('Password reset', 'You can now log in with your new password.', [{ text: 'Log in', onPress: () => router.replace('/login') }]);
    } catch (e) { setError(errorMessage(e)); setBusy(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="" />
      <ScrollView contentContainerStyle={{ padding: space.xxl }} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>{step === 'email' ? 'Forgot your password?' : 'Enter your code'}</Text>
        <Text style={s.sub}>{step === 'email' ? 'We’ll email you an 8-digit code to set a new one.' : `If ${email.trim()} has an account, we’ve sent an 8-digit code. It works for 30 minutes.`}</Text>
        {step === 'email' ? (
          <>
            <Field label="Email" placeholder="you@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            {error ? <Text style={s.err}>{error}</Text> : null}
            <Button label="Send code" onPress={sendCode} loading={busy} />
          </>
        ) : (
          <>
            <Field label="8-digit code" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 8))} keyboardType="number-pad" autoComplete="one-time-code" />
            <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" placeholder="At least 10 characters" />
            {error ? <Text style={s.err}>{error}</Text> : null}
            <Button label="Reset password" onPress={reset} loading={busy} disabled={code.length !== 8 || password.length < 10} />
            <Text style={s.foot} onPress={() => { setStep('email'); setError(''); }}>Use a different email</Text>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: font.extrabold, fontSize: 30, color: colors.navy900, letterSpacing: -0.8 },
  sub: { fontFamily: font.regular, fontSize: 16, lineHeight: 23, color: colors.muted, marginTop: 6, marginBottom: space.xxl },
  err: { color: colors.poorText, fontFamily: font.medium, fontSize: 14, marginBottom: space.md },
  foot: { textAlign: 'center', marginTop: space.xl, fontFamily: font.semibold, fontSize: 16, color: colors.teal700, textDecorationLine: 'underline' },
});
