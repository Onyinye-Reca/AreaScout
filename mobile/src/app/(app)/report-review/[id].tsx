import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { REASON, reasonColor } from '../../../components/admin';
import { Photo } from '../../../components/Photo';
import { ErrorState, Loading } from '../../../components/States';
import { BottomBar, Button, Card, Field, Header, Mono, Tag } from '../../../components/ui';
import { api, errorMessage } from '../../../lib/api';
import { naira, shortAgo } from '../../../lib/format';
import { useLoad } from '../../../lib/hooks';
import { colors, font, radius, space } from '../../../lib/theme';
import type { ReportGroup } from '../../../lib/types';

type Action = 'remove_and_suspend' | 'remove' | 'request_info' | 'dismiss';

/** Review everything reported about one listing, then take one action that closes all of its reports. */
export default function ReportReview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const data = useLoad(() => api<ReportGroup>(`/admin/reports/listing/${id}`), [id]);
  const [action, setAction] = useState<Action>();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  if (data.loading && !data.data) return <View style={{ flex: 1 }}><Header title="Report" /><Loading /></View>;
  if (data.error && !data.data) {
    // Someone else may have already resolved it.
    return <View style={{ flex: 1 }}><Header title="Report" /><ErrorState error={data.error} onRetry={data.reload} /></View>;
  }
  if (!data.data) return null;
  const g = data.data;
  const o = g.owner;

  const options: { v: Action; title: string; sub: string; danger?: boolean }[] = [
    ...(o.role !== 'admin' ? [{ v: 'remove_and_suspend' as const, title: 'Remove listing and suspend lister', sub: `Hides all ${o.listing_count} ${o.listing_count === 1 ? 'listing' : 'listings'}, blocks sign-in`, danger: true }] : []),
    { v: 'remove', title: 'Remove this listing only', sub: 'The lister can still list other properties', danger: true },
    { v: 'request_info', title: 'Ask lister for more information', sub: 'Listing stays hidden while we wait' },
    { v: 'dismiss', title: 'Dismiss reports', sub: g.hidden_by_reports ? 'Listing goes back live' : 'Listing stays as it is' },
  ];

  async function submit() {
    if (!action) return;
    setBusy(true);
    try {
      await api(`/admin/reports/listing/${g.listing_id}/resolve`, { method: 'POST', body: { action, note: note.trim() } });
      router.back();
    } catch (e) { Alert.alert('Couldn’t apply that action', errorMessage(e)); setBusy(false); }
  }
  const confirm = () => {
    const picked = options.find((x) => x.v === action)!;
    if (!picked.danger) return submit();
    Alert.alert(picked.title + '?', 'This closes all open reports on this listing.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', style: 'destructive', onPress: submit }]);
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title={`Reports · ${g.listing_title}`} subtitle={`Opened ${shortAgo(g.oldest_at)} ago · ${g.reporters} ${g.reporters === 1 ? 'reporter' : 'reporters'}`} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }} keyboardShouldPersistTaps="handled">
        <Card style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
          <Photo uri={g.photo ?? undefined} tint={g.listing_id} label="" style={{ width: 84, height: 84, borderRadius: radius.input }} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.title}>{g.listing_title}</Text>
            <Mono style={{ color: colors.muted, fontSize: 15 }}>{naira(g.rent)} /yr</Mono>
            {g.listing_status === 'live' ? <Tag label="Live" tone="good" /> : g.listing_status === 'removed' ? <Tag label="Removed" tone="neutral" /> : <Tag label="Hidden pending review" tone="poor" />}
          </View>
        </Card>

        <Card>
          <Text style={s.h}>What reporters said</Text>
          <View style={{ gap: space.lg, marginTop: space.md }}>
            {g.reports.map((r) => (
              <View key={r.id} style={s.quote}>
                <Text style={[s.reason, { color: reasonColor(r.reason) }]}>{REASON[r.reason].label}</Text>
                <Text style={s.said}>{r.details ? `“${r.details}”` : 'No details given.'}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={s.h}>{o.role === 'agent' ? 'Agent' : 'Landlord'}: {o.name}</Text>
          <View style={{ gap: 8, marginTop: space.md }}>
            <Fact k="Account age" v={o.account_age_days === 0 ? 'Today' : `${o.account_age_days} ${o.account_age_days === 1 ? 'day' : 'days'}`} />
            <Fact k="Verification" v={o.verified ? 'Verified' : 'Not verified'} bad={!o.verified} />
            <Fact k="Listings" v={String(o.listing_count)} />
            <Fact k="Past reports" v={o.past_reports ? `${o.past_reports} on other listings` : 'None'} bad={o.past_reports > 0} />
          </View>
        </Card>

        <Card>
          <Text style={s.h}>Action</Text>
          <View style={{ gap: space.sm, marginTop: space.md }}>
            {options.map((x) => (
              <Pressable key={x.v} onPress={() => setAction(x.v)} accessibilityRole="radio" accessibilityState={{ selected: action === x.v }} style={[s.opt, action === x.v && s.optOn]}>
                <View style={action === x.v ? s.radioOn : s.radio}>{action === x.v ? <View style={s.dot} /> : null}</View>
                <View style={{ flex: 1 }}><Text style={s.optTitle}>{x.title}</Text><Text style={s.optSub}>{x.sub}</Text></View>
              </Pressable>
            ))}
          </View>
          <View style={{ height: space.lg }} />
          <Field label="Note" optional multiline value={note} onChangeText={setNote} placeholder="Recorded with the reports" />
        </Card>
      </ScrollView>
      <BottomBar><Button label="Apply action" disabled={!action} loading={busy} onPress={confirm} style={{ flex: 1 }} /></BottomBar>
    </View>
  );
}

function Fact({ k, v, bad }: { k: string; v: string; bad?: boolean }) {
  return <View style={{ flexDirection: 'row', gap: space.lg }}><Text style={s.k}>{k}</Text><Text style={[s.v, bad && { color: colors.poorText }]}>{v}</Text></View>;
}

const s = StyleSheet.create({
  title: { fontFamily: font.extrabold, fontSize: 19, color: colors.navy900 },
  h: { fontFamily: font.extrabold, fontSize: 19, color: colors.navy900 },
  quote: { borderLeftWidth: 3, borderLeftColor: colors.line, paddingLeft: space.md, gap: 4 },
  reason: { fontFamily: font.bold, fontSize: 15 },
  said: { fontFamily: font.regular, fontSize: 16, lineHeight: 23, color: colors.navy900 },
  k: { width: 110, fontFamily: font.regular, fontSize: 16, color: colors.muted },
  v: { flex: 1, fontFamily: font.semibold, fontSize: 16, color: colors.navy900 },
  opt: { flexDirection: 'row', gap: space.md, alignItems: 'center', padding: space.lg, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line },
  optOn: { borderWidth: 2, borderColor: colors.navy800, backgroundColor: '#F4F7FC' },
  optTitle: { fontFamily: font.bold, fontSize: 16, color: colors.navy900 },
  optSub: { fontFamily: font.regular, fontSize: 14, color: colors.muted, marginTop: 2 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#B7BFCD' },
  radioOn: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.navy800, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#fff' },
});
