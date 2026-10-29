import { useLocalSearchParams, useRouter } from 'expo-router';
import { CircleCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomBar, Button, Field, Header } from '../../../components/ui';
import { api, errorMessage } from '../../../lib/api';
import { colors, font, radius, space } from '../../../lib/theme';

const REASONS = [
  { v: 'inaccurate', label: 'Details are wrong', sub: 'Price, size or fees don’t match' },
  { v: 'scam', label: 'Looks like a scam', sub: 'Asked to pay before inspecting, or something feels off' },
  { v: 'unavailable', label: 'No longer available', sub: 'The home has already been rented' },
  { v: 'duplicate', label: 'Duplicate listing', sub: 'The same home is listed more than once' },
  { v: 'other', label: 'Something else', sub: '' },
];

export default function ReportListing() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [reason, setReason] = useState<string>();
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function send() {
    setBusy(true); setError('');
    try { await api(`/listings/${id}/report`, { method: 'POST', body: { reason, details: details.trim() } }); setSent(true); }
    catch (e) { setError(errorMessage(e)); }
    setBusy(false);
  }

  if (sent) {
    return (
      <View style={{ flex: 1 }}>
        <Header title="Report listing" />
        <View style={s.done}>
          <View style={s.doneIcon}><CircleCheck size={36} color={colors.teal700} strokeWidth={1.8} /></View>
          <Text style={s.doneTitle}>Thanks for telling us</Text>
          <Text style={s.doneBody}>Our team will review this listing. We may remove it if it breaks our rules.</Text>
          <Button label="Done" onPress={() => router.back()} style={{ alignSelf: 'stretch', marginTop: space.xl }} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Header title="Report listing" />
      <ScrollView contentContainerStyle={{ padding: space.lg }} keyboardShouldPersistTaps="handled">
        <Text style={s.lead}>What’s wrong with this listing?</Text>
        {REASONS.map((r) => (
          <Pressable key={r.v} onPress={() => setReason(r.v)} accessibilityRole="radio" accessibilityState={{ selected: reason === r.v }} style={[s.row, reason === r.v && s.rowOn]}>
            <View style={{ flex: 1 }}><Text style={s.rowTitle}>{r.label}</Text>{r.sub ? <Text style={s.rowSub}>{r.sub}</Text> : null}</View>
            <View style={reason === r.v ? s.radioOn : s.radio}>{reason === r.v ? <View style={s.dot} /> : null}</View>
          </Pressable>
        ))}
        <View style={{ height: space.lg }} />
        <Field label="Tell us more" optional multiline value={details} onChangeText={setDetails} placeholder="Anything that helps us check this" />
        {error ? <Text style={s.err}>{error}</Text> : null}
      </ScrollView>
      <BottomBar><Button label="Send report" disabled={!reason} loading={busy} onPress={send} style={{ flex: 1 }} /></BottomBar>
    </View>
  );
}

const s = StyleSheet.create({
  lead: { fontFamily: font.extrabold, fontSize: 22, color: colors.navy900, marginBottom: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', marginBottom: space.sm },
  rowOn: { borderWidth: 2, borderColor: colors.navy800, backgroundColor: '#F4F7FC' },
  rowTitle: { fontFamily: font.bold, fontSize: 16, color: colors.navy900 },
  rowSub: { fontFamily: font.regular, fontSize: 14, color: colors.muted, marginTop: 2 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#B7BFCD' },
  radioOn: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.navy800, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#fff' },
  err: { color: colors.poorText, fontFamily: font.medium, fontSize: 14 },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxxl },
  doneIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.teal100, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  doneTitle: { fontFamily: font.extrabold, fontSize: 26, color: colors.navy900 },
  doneBody: { fontFamily: font.regular, fontSize: 16, lineHeight: 23, color: colors.muted, textAlign: 'center', marginTop: space.sm },
});
