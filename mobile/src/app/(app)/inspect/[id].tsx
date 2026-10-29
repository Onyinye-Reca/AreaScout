import { useLocalSearchParams, useRouter } from 'expo-router';
import { CircleCheck, ShieldCheck, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DayTimePicker, slotDate, slotSummary, useDays } from '../../../components/DayTimePicker';
import { Photo } from '../../../components/Photo';
import { ErrorState, Loading } from '../../../components/States';
import { BottomBar, Button, Field, Header } from '../../../components/ui';
import { api, errorMessage } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { useLoad } from '../../../lib/hooks';
import { colors, font, radius, space } from '../../../lib/theme';
import type { Listing } from '../../../lib/types';

export default function Inspect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const data = useLoad(() => api<{ listing: Listing }>(`/listings/${id}`).then((r) => r.listing), [id]);
  const days = useDays();
  const [day, setDay] = useState(0);
  const [hour, setHour] = useState(11);
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [error, setError] = useState('');

  if (data.loading && !data.data) return <View style={{ flex: 1 }}><Header title="Request inspection" /><Loading /></View>;
  if (data.error && !data.data) return <View style={{ flex: 1 }}><Header title="Request inspection" /><ErrorState error={data.error} onRetry={data.reload} /></View>;
  if (!data.data) return null;
  const l = data.data;

  const when = slotDate(days[day], hour);
  const summary = slotSummary(when);

  async function send() {
    setState('sending'); setError('');
    try {
      const notes = [phone.trim() && `Call me on ${phone.trim()}.`, note.trim()].filter(Boolean).join(' ');
      await api('/inspections', { method: 'POST', body: { listing_id: l.id, requested_at: when.toISOString(), note: notes } });
      setState('sent');
    } catch (e) { setError(errorMessage(e)); setState('failed'); }
  }

  if (state === 'sent') {
    return (
      <View style={{ flex: 1 }}>
        <Header title="Request inspection" />
        <View style={s.done}>
          <View style={s.doneIcon}><CircleCheck size={36} color={colors.teal700} strokeWidth={1.8} /></View>
          <Text style={s.doneTitle}>Request sent</Text>
          <Text style={s.doneBody}>{l.owner_name} will confirm {summary}. You’ll see their reply under Inspections & updates.</Text>
          <Button label="View my requests" onPress={() => router.replace('/notifications')} style={{ alignSelf: 'stretch', marginTop: space.xl }} />
          <Button label="Back to home" variant="ghost" onPress={() => router.dismissAll()} style={{ alignSelf: 'stretch' }} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Request inspection" />
      <ScrollView contentContainerStyle={{ padding: space.lg }} keyboardShouldPersistTaps="handled">
        <View style={s.home}>
          <Photo uri={l.photos[0]} tint={l.id} label="" style={{ width: 64, height: 64, borderRadius: radius.input }} />
          <View style={{ flex: 1 }}><Text style={s.homeTitle} numberOfLines={2}>{l.title}</Text><Text style={s.homeSub}>with {l.owner_name}{l.owner_verified ? ' · Verified' : ''}</Text></View>
        </View>

        <DayTimePicker days={days} day={day} hour={hour} onDay={setDay} onHour={setHour} />
        <Text style={s.hint}>The agent confirms or suggests another time.</Text>

        <View style={{ height: space.xl }} />
        <Field label="Phone for the agent to confirm" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="0803 000 0000" />
        <Field label="Note to the agent" optional multiline value={note} onChangeText={setNote} placeholder="Anything you’d like to check during the visit?" />

        <View style={s.safe}><ShieldCheck size={22} color={colors.navy800} strokeWidth={1.8} /><Text style={s.safeText}>Inspections are free. Don’t pay any money until you’ve seen the home and the documents.</Text></View>
        {state === 'failed' ? (
          <View style={s.fail}><TriangleAlert size={20} color={colors.poorText} strokeWidth={1.8} /><View style={{ flex: 1 }}><Text style={s.failTitle}>We couldn’t send your request</Text><Text style={s.failBody}>{error}</Text></View></View>
        ) : null}
      </ScrollView>
      <BottomBar><Button label={state === 'failed' ? 'Try again' : `Send request · ${summary}`} loading={state === 'sending'} onPress={send} style={{ flex: 1 }} /></BottomBar>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  home: { flexDirection: 'row', gap: space.md, alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.card, padding: space.md, borderWidth: 1, borderColor: colors.line },
  homeTitle: { fontFamily: font.bold, fontSize: 17, color: colors.navy900 },
  homeSub: { fontFamily: font.regular, fontSize: 14, color: colors.muted, marginTop: 2 },
  hint: { fontFamily: font.regular, fontSize: 14, color: colors.muted, marginTop: space.sm },
  safe: { flexDirection: 'row', gap: space.md, backgroundColor: colors.navy100, borderRadius: radius.card, padding: space.lg, alignItems: 'center' },
  safeText: { flex: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.navy900 },
  fail: { flexDirection: 'row', gap: space.md, marginTop: space.lg, backgroundColor: colors.poorBg, borderRadius: radius.card, padding: space.lg },
  failTitle: { fontFamily: font.bold, fontSize: 15, color: colors.poorText },
  failBody: { fontFamily: font.regular, fontSize: 14, color: colors.poorText, marginTop: 2 },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxxl },
  doneIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.teal100, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  doneTitle: { fontFamily: font.extrabold, fontSize: 26, color: colors.navy900 },
  doneBody: { fontFamily: font.regular, fontSize: 16, lineHeight: 23, color: colors.muted, textAlign: 'center', marginTop: space.sm },
});
