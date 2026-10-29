import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { ErrorState, Loading } from '../../../components/States';
import { Card, Header } from '../../../components/ui';
import { api } from '../../../lib/api';
import { useLoad } from '../../../lib/hooks';
import { colors, font, space } from '../../../lib/theme';
import type { Preferences } from '../../../lib/types';

const ROWS: { key: keyof Preferences; title: string; sub: string }[] = [
  { key: 'inspection_updates', title: 'Inspection updates', sub: 'When an agent confirms, declines or suggests a new time' },
  { key: 'messages', title: 'Messages', sub: 'New messages from agents or renters' },
  { key: 'saved_search_alerts', title: 'Saved search alerts', sub: 'New homes that match a saved search' },
  { key: 'area_report_updates', title: 'Area reports', sub: 'When your area report is reviewed' },
];

export default function Notifications() {
  const data = useLoad(() => api<{ preferences: Preferences }>('/me/preferences').then((r) => r.preferences));
  const [override, setOverride] = useState<Partial<Preferences>>({});

  async function toggle(key: keyof Preferences, value: boolean) {
    setOverride((o) => ({ ...o, [key]: value })); // optimistic
    try { await api('/me/preferences', { method: 'PUT', body: { [key]: value } }); }
    catch { setOverride((o) => ({ ...o, [key]: !value })); Alert.alert('Couldn’t save', 'Check your connection and try again.'); }
  }

  if (data.loading && !data.data) return <View style={{ flex: 1 }}><Header title="Notifications" /><Loading /></View>;
  if (data.error && !data.data) return <View style={{ flex: 1 }}><Header title="Notifications" /><ErrorState error={data.error} onRetry={data.reload} /></View>;
  const prefs = { ...data.data!, ...override };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Notifications" />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
        <Text style={s.note}>Updates always appear inside AreaScout. Push and email alerts aren’t switched on yet, so your choices are saved for when they are.</Text>
        <Card style={{ paddingVertical: space.xs }}>
          {ROWS.map((r, i) => (
            <View key={r.key} style={[s.row, i > 0 && s.border]}>
              <View style={{ flex: 1 }}><Text style={s.title}>{r.title}</Text><Text style={s.sub}>{r.sub}</Text></View>
              <Switch value={prefs[r.key]} onValueChange={(v) => toggle(r.key, v)} trackColor={{ true: colors.teal500, false: colors.line }} accessibilityLabel={r.title} />
            </View>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  note: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.lg },
  border: { borderTopWidth: 1, borderTopColor: colors.line },
  title: { fontFamily: font.bold, fontSize: 16, color: colors.navy900 },
  sub: { fontFamily: font.regular, fontSize: 14, color: colors.muted, marginTop: 2 },
});
