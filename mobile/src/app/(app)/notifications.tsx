import { useRouter } from 'expo-router';
import { CalendarDays, CircleCheck, CircleX } from 'lucide-react-native';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { EmptyState, ErrorState, Loading } from '../../components/States';
import { Button, Header, Tag } from '../../components/ui';
import { api } from '../../lib/api';
import { timeAgo } from '../../lib/format';
import { useLoad } from '../../lib/hooks';
import { colors, font, radius, space } from '../../lib/theme';
import type { Inspection } from '../../lib/types';

const STATUS = {
  pending: { label: 'Waiting for the agent', tone: 'fair' as const },
  confirmed: { label: 'Confirmed', tone: 'good' as const },
  declined: { label: 'Declined', tone: 'poor' as const },
  new_time: { label: 'New time suggested', tone: 'fair' as const },
  cancelled: { label: 'Cancelled', tone: 'poor' as const },
};

export default function Notifications() {
  const router = useRouter();
  const data = useLoad(() => api<{ inspections: Inspection[] }>('/inspections').then((r) => r.inspections));
  const cancel = async (id: number) => { await api(`/inspections/${id}`, { method: 'PATCH', body: { status: 'cancelled' } }).catch(() => {}); data.reload(); };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Inspections & updates" />
      {data.loading && !data.data ? <Loading /> : data.error && !data.data ? <ErrorState error={data.error} onRetry={data.reload} /> :
        !data.data?.length ? <EmptyState title="No requests yet" body="Request an inspection from any home and the agent’s reply shows up here." action="Browse homes" onAction={() => router.dismissAll()} /> : (
          <FlatList data={data.data} keyExtractor={(i) => String(i.id)} onRefresh={data.reload} refreshing={false} contentContainerStyle={{ padding: space.lg, gap: space.md }}
            renderItem={({ item: i }) => {
              const st = STATUS[i.status];
              const Icon = i.status === 'confirmed' ? CircleCheck : i.status === 'declined' || i.status === 'cancelled' ? CircleX : CalendarDays;
              return (
                <View style={s.card}>
                  <View style={s.top}>
                    <Icon size={22} color={colors.navy800} strokeWidth={1.8} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.title} numberOfLines={2}>{i.listing_title ?? 'Home'}</Text>
                      <Text style={s.when}>{new Date(i.requested_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                  </View>
                  <Tag label={st.label} tone={st.tone} />
                  {i.owner_note ? <Text style={s.note}>“{i.owner_note}”</Text> : null}
                  {i.can_review ? <Button label={`Rate ${i.owner_name ?? 'your visit'}`} variant="outline" style={{ height: 44 }} onPress={() => router.push(`/rate/${i.id}?name=${encodeURIComponent(i.owner_name ?? '')}`)} /> : null}
                  <View style={s.foot}>
                    <Text style={s.ago}>Requested {timeAgo(i.requested_at)}</Text>
                    {i.status === 'pending' || i.status === 'new_time' ? <Pressable onPress={() => cancel(i.id)} accessibilityRole="button"><Text style={s.cancel}>Cancel request</Text></Pressable> : null}
                  </View>
                </View>
              );
            }} />
        )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.lg, gap: space.md },
  top: { flexDirection: 'row', gap: space.md },
  title: { fontFamily: font.bold, fontSize: 17, color: colors.navy900 },
  when: { fontFamily: font.regular, fontSize: 14, color: colors.muted, marginTop: 2 },
  note: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.navy900 },
  foot: { flexDirection: 'row', justifyContent: 'space-between' },
  ago: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  cancel: { fontFamily: font.bold, fontSize: 14, color: colors.poorText },
});
