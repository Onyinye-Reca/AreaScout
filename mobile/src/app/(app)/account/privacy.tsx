import { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, Header } from '../../../components/ui';
import { api, errorMessage } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { colors, font, space } from '../../../lib/theme';

export default function Privacy() {
  const { user, signOut } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function exportData() {
    setExporting(true);
    try {
      const data = await api<unknown>('/me/export');
      await Share.share({ title: 'My AreaScout data', message: JSON.stringify(data, null, 2) });
    } catch (e) { Alert.alert('Couldn’t export your data', errorMessage(e)); }
    setExporting(false);
  }

  function confirmDelete() {
    Alert.alert('Delete your account?', 'This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete my account', style: 'destructive', onPress: async () => {
        setDeleting(true); setError('');
        try { await api('/me', { method: 'DELETE', body: { password } }); await signOut(); }
        catch (e) { setError(errorMessage(e)); setDeleting(false); }
      } },
    ]);
  }

  const lister = user?.role !== 'tenant';
  return (
    <View style={{ flex: 1 }}>
      <Header title="Privacy & data" />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }} keyboardShouldPersistTaps="handled">
        <Text style={s.body}>AreaScout keeps your account details, saved homes and searches, inspection requests, messages and area reports so the service works. You can take a copy or delete it all.</Text>
        <Card style={{ gap: space.md }}>
          <Text style={s.h}>Download my data</Text>
          <Text style={s.sub}>A copy of everything we hold about you, which you can save or send to yourself.</Text>
          <Button label="Export my data" variant="outline" loading={exporting} onPress={exportData} />
        </Card>
        <Card style={{ gap: space.md, borderColor: colors.poor }}>
          <Text style={[s.h, { color: colors.poorText }]}>Delete my account</Text>
          <Text style={s.sub}>Removes your saved homes and searches and signs you out everywhere. Messages you sent stay visible to the other person, but without your name.{lister ? ' Your listings will be taken down.' : ''}</Text>
          <Field label="Your password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
          {error ? <Text style={s.err}>{error}</Text> : null}
          <Button label="Delete my account" variant="outline" disabled={!password} loading={deleting} onPress={confirmDelete} style={{ borderColor: colors.poor }} />
        </Card>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.navy900 },
  h: { fontFamily: font.extrabold, fontSize: 18, color: colors.navy900 },
  sub: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.muted },
  err: { color: colors.poorText, fontFamily: font.medium, fontSize: 14 },
});
