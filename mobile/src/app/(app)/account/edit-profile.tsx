import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomBar, Button, Field, Header } from '../../../components/ui';
import { api, errorMessage } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { colors, font, space } from '../../../lib/theme';
import type { User } from '../../../lib/types';

export default function EditProfile() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!name.trim()) { setError('Enter your name'); return; }
    setBusy(true); setError('');
    try {
      const r = await api<{ user: User }>('/me', { method: 'PATCH', body: { name: name.trim(), phone: phone.trim() } });
      updateUser(r.user);
      router.back();
    } catch (e) { setError(errorMessage(e)); setBusy(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Edit profile" />
      <ScrollView contentContainerStyle={{ padding: space.lg }} keyboardShouldPersistTaps="handled">
        <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" />
        <Field label="Phone number" optional value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="0803 000 0000" />
        <Text style={s.hint}>Your email ({user?.email}) can’t be changed here.</Text>
        {error ? <View><Text style={s.err}>{error}</Text></View> : null}
      </ScrollView>
      <BottomBar><Button label="Save changes" loading={busy} onPress={save} style={{ flex: 1 }} /></BottomBar>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  hint: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
  err: { color: colors.poorText, fontFamily: font.medium, fontSize: 14, marginTop: space.md },
});
