import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { BottomBar, Button, Field, Header } from '../../../components/ui';
import { api, errorMessage } from '../../../lib/api';
import { colors, font, space } from '../../../lib/theme';

export default function ChangePassword() {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (next.length < 10) { setError('Use at least 10 characters for the new password'); return; }
    setBusy(true); setError('');
    try {
      await api('/me/password', { method: 'POST', body: { current_password: current, new_password: next } });
      Alert.alert('Password changed', 'You’re still signed in here. Other devices have been signed out.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) { setError(errorMessage(e)); setBusy(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Change password" />
      <ScrollView contentContainerStyle={{ padding: space.lg }} keyboardShouldPersistTaps="handled">
        <Field label="Current password" value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" />
        <Field label="New password" value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" placeholder="At least 10 characters" />
        {error ? <Text style={s.err}>{error}</Text> : null}
      </ScrollView>
      <BottomBar><Button label="Change password" loading={busy} disabled={!current || !next} onPress={save} style={{ flex: 1 }} /></BottomBar>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({ err: { color: colors.poorText, fontFamily: font.medium, fontSize: 14 } });
