import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { Button, Field, Header } from '../../components/ui';
import { errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors, font, space } from '../../lib/theme';

export default function Login() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || !password) { setError('Enter your email and password'); return; }
    setBusy(true); setError('');
    try { await signIn(email.trim().toLowerCase(), password); }
    catch (e) { setError(errorMessage(e)); setBusy(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="" />
      <ScrollView contentContainerStyle={{ padding: space.xxl }} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Welcome back</Text>
        <Text style={s.sub}>Log in to pick up where you left off.</Text>
        <Field label="Email" placeholder="you@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" onSubmitEditing={submit} />
        {error ? <Text style={s.err}>{error}</Text> : null}
        <Text style={s.forgot} onPress={() => router.push('/forgot-password')} accessibilityRole="link">Forgot your password?</Text>
        <Button label="Log in" onPress={submit} loading={busy} style={{ marginTop: space.md }} />
        <Text style={s.foot}>New here? <Text style={s.link} onPress={() => router.replace('/signup')}>Create an account</Text></Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: font.extrabold, fontSize: 32, color: colors.navy900, letterSpacing: -0.8 },
  sub: { fontFamily: font.regular, fontSize: 17, color: colors.muted, marginTop: 6, marginBottom: space.xxl },
  err: { color: colors.poorText, fontFamily: font.medium, fontSize: 14, marginBottom: 4 },
  forgot: { fontFamily: font.semibold, fontSize: 15, color: colors.teal700, textDecorationLine: 'underline', marginBottom: space.sm },
  foot: { textAlign: 'center', marginTop: space.lg, fontFamily: font.regular, fontSize: 16, color: colors.muted },
  link: { color: colors.teal700, fontFamily: font.semibold, textDecorationLine: 'underline' },
});
