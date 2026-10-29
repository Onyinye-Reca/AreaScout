import { useRouter } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, ErrorState, Loading } from '../../../components/States';
import { Button, Tag } from '../../../components/ui';
import { api, errorMessage } from '../../../lib/api';
import { initials } from '../../../lib/format';
import { useLoad } from '../../../lib/hooks';
import { colors, font, radius, space } from '../../../lib/theme';
import type { Inspection } from '../../../lib/types';

type Tab = 'requests' | 'upcoming' | 'past';

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).replace(',', '').replace(' ', ' ');

function bucket(i: Inspection): Tab {
  if (i.status === 'pending') return 'requests';
  const future = new Date(i.requested_at).getTime() >= Date.now();
  return (i.status === 'confirmed' || i.status === 'new_time') && future ? 'upcoming' : 'past';
}

const TAG = {
  pending: { label: 'Pending', tone: 'fair' as const },
  confirmed: { label: 'Confirmed', tone: 'good' as const },
  declined: { label: 'Declined', tone: 'poor' as const },
  new_time: { label: 'New time sent', tone: 'fair' as const },
  cancelled: { label: 'Cancelled', tone: 'neutral' as const },
};

export default function HostInspections() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('requests');
  const [busy, setBusy] = useState<number | null>(null);
  const data = useLoad(() => api<{ inspections: Inspection[] }>('/inspections').then((r) => r.inspections));

  const all = data.data ?? [];
  const counts = { requests: all.filter((i) => bucket(i) === 'requests').length, upcoming: 0, past: 0 };
  const shown = all.filter((i) => bucket(i) === tab).sort((a, b) => (tab === 'past' ? b.requested_at.localeCompare(a.requested_at) : a.requested_at.localeCompare(b.requested_at)));

  async function respond(i: Inspection, status: 'confirmed' | 'declined') {
    setBusy(i.id);
    try { await api(`/inspections/${i.id}`, { method: 'PATCH', body: { status } }); data.reload(); }
    catch (e) { Alert.alert('Couldn’t update the request', errorMessage(e)); }
    setBusy(null);
  }
  const decline = (i: Inspection) =>
    Alert.alert('Decline this request?', `${i.tenant_name ?? 'The renter'} will be told you can’t host this visit.`, [
      { text: 'Keep request', style: 'cancel' }, { text: 'Decline', style: 'destructive', onPress: () => respond(i, 'declined') },
    ]);

  return (
    <View style={{ flex: 1, paddingTop: top }}>
      <Text style={s.title}>Inspections</Text>
      <View style={s.tabs}>
        {(['requests', 'upcoming', 'past'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} style={[s.tab, tab === t && s.tabOn]}>
            <Text style={[s.tabText, tab === t && { color: colors.navy900, fontFamily: font.bold }]}>{t[0].toUpperCase() + t.slice(1)}</Text>
            {t === 'requests' && counts.requests > 0 ? <View style={s.badge}><Text style={s.badgeText}>{counts.requests}</Text></View> : null}
          </Pressable>
        ))}
      </View>
      {data.loading && !data.data ? <Loading /> : data.error && !data.data ? <ErrorState error={data.error} onRetry={data.reload} /> : (
        <FlatList data={shown} keyExtractor={(i) => String(i.id)} onRefresh={data.reload} refreshing={false} contentContainerStyle={{ padding: space.lg, gap: space.md, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState title={tab === 'requests' ? 'No requests waiting' : tab === 'upcoming' ? 'Nothing coming up' : 'No past inspections'}
            body={tab === 'requests' ? 'When a renter asks to see one of your homes, it shows up here.' : 'Confirmed visits appear here.'} />}
          renderItem={({ item: i }) => {
            const t = TAG[i.status];
            return (
              <View style={s.card}>
                <View style={s.top}>
                  <View style={s.avatar}><Text style={s.avatarText}>{initials(i.tenant_name ?? '?')}</Text></View>
                  <View style={{ flex: 1 }}><Text style={s.name}>{i.tenant_name}</Text><Text style={s.sub} numberOfLines={1}>{i.listing_title}</Text></View>
                  <Tag label={t.label} tone={t.tone} />
                </View>
                <View style={s.when}><CalendarDays size={18} color={colors.navy800} strokeWidth={1.8} /><Text style={s.whenText}>{when(i.requested_at)}</Text></View>
                {i.note ? <Text style={s.note}>“{i.note}”</Text> : null}
                {i.status === 'pending' ? (
                  <>
                    <View style={{ flexDirection: 'row', gap: space.md }}>
                      <Button label="New time" variant="outline" style={{ flex: 1 }} onPress={() => router.push(`/new-time/${i.id}`)} />
                      <Button label="Confirm" style={{ flex: 1 }} loading={busy === i.id} onPress={() => respond(i, 'confirmed')} />
                    </View>
                    <Pressable onPress={() => decline(i)} style={{ alignItems: 'center', paddingVertical: 6 }} accessibilityRole="button"><Text style={s.decline}>Decline request</Text></Pressable>
                  </>
                ) : null}
              </View>
            );
          }} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: font.extrabold, fontSize: 30, color: colors.navy900, letterSpacing: -0.6, paddingHorizontal: space.xl, paddingTop: space.xl },
  tabs: { flexDirection: 'row', gap: space.xl, paddingHorizontal: space.xl, marginTop: space.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent', marginBottom: -1 },
  tabOn: { borderBottomColor: colors.navy800 },
  tabText: { fontFamily: font.semibold, fontSize: 17, color: colors.muted },
  badge: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: colors.navy800, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontFamily: font.bold, fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: radius.card + 4, borderWidth: 1, borderColor: colors.line, padding: space.lg, gap: space.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.navy100, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: font.bold, fontSize: 16, color: colors.navy800 },
  name: { fontFamily: font.extrabold, fontSize: 19, color: colors.navy900 },
  sub: { fontFamily: font.regular, fontSize: 15, color: colors.muted },
  when: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.canvas, borderRadius: radius.input, padding: space.md },
  whenText: { fontFamily: font.bold, fontSize: 16, color: colors.navy900 },
  note: { fontFamily: font.regular, fontSize: 16, lineHeight: 23, color: colors.muted },
  decline: { fontFamily: font.bold, fontSize: 16, color: colors.poorText },
});
