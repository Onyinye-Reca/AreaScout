import { useRouter } from 'expo-router';
import { Camera, CalendarDays, ChevronRight, EllipsisVertical, MessageSquare, Plus, ShieldCheck, type LucideIcon } from 'lucide-react-native';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Photo } from '../components/Photo';
import { ErrorState, Loading } from '../components/States';
import { Tag } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { timeAgo } from '../lib/format';
import { useLoad } from '../lib/hooks';
import { colors, font, radius, space } from '../lib/theme';
import type { Dashboard, Listing, ListingStatus } from '../lib/types';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

const STATUS: Record<ListingStatus, { label: string; tone: 'good' | 'fair' | 'poor' | 'neutral'; when: string }> = {
  live: { label: 'Live', tone: 'good', when: 'Updated' },
  pending: { label: 'Under review', tone: 'fair', when: 'Submitted' },
  draft: { label: 'Draft', tone: 'neutral', when: 'Last edited' },
  rejected: { label: 'Not approved', tone: 'poor', when: 'Reviewed' },
  removed: { label: 'Removed', tone: 'neutral', when: 'Removed' },
};

export default function HostDashboard() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { user } = useAuth();
  const data = useLoad(async () => {
    const [dashboard, mine] = await Promise.all([api<Dashboard>('/my/dashboard'), api<{ listings: Listing[] }>('/my/listings')]);
    return { dashboard, listings: mine.listings.filter((l) => l.status !== 'removed') };
  });

  const edit = (l: Listing) => {
    const go = () => router.push(`/listing-editor/${l.id}`);
    if (l.status === 'draft' || l.status === 'rejected') return go();
    Alert.alert('Edit this listing?', 'Changes send the listing back for review, and it won’t show to renters until it’s approved again.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Edit', onPress: go }]);
  };
  const remove = (l: Listing) =>
    Alert.alert('Remove this listing?', `“${l.title}” will no longer be visible to renters.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { try { await api(`/listings/${l.id}`, { method: 'DELETE' }); data.reload(); } catch (e) { Alert.alert('Couldn’t remove', errorMessage(e)); } } },
    ]);
  const menu = (l: Listing) =>
    Alert.alert(l.title, undefined, [
      { text: 'Edit', onPress: () => edit(l) },
      ...(l.status === 'live' ? [{ text: 'View as renter', onPress: () => router.push(`/listing/${l.id}`) }] : []),
      { text: 'Remove', style: 'destructive' as const, onPress: () => remove(l) },
      { text: 'Cancel', style: 'cancel' as const },
    ]);

  const d = data.data?.dashboard;
  const draft = data.data?.listings.find((l) => l.status === 'draft');

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={data.reload} />} contentContainerStyle={{ paddingBottom: space.xxxl }}>
      <View style={[s.hero, { paddingTop: top + space.xl }]}>
        <View style={s.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.greet}>{greeting()}, {user?.name.split(' ')[0]}</Text>
            {user?.verified ? <View style={s.verified}><ShieldCheck size={16} color={colors.teal400} strokeWidth={2} /><Text style={s.verifiedText}>Verified {user.role}</Text></View>
              : <Text style={s.unverified}>Listings are checked before going live</Text>}
          </View>
          <Pressable onPress={() => router.push('/listing-editor/new')} accessibilityRole="button" style={s.newBtn}>
            <Plus size={20} color={colors.navy900} strokeWidth={2.4} /><Text style={s.newText}>New listing</Text>
          </Pressable>
        </View>
        <View style={s.tiles}>
          <Tile value={d?.live_listings} label="Live listings" />
          <Tile value={d?.unanswered_messages} label="Unanswered messages" />
          <Tile value={d?.upcoming_inspections} label="Inspections this week" />
        </View>
      </View>

      {data.loading && !data.data ? <View style={{ height: 260 }}><Loading /></View> : data.error && !data.data ? <View style={{ height: 360 }}><ErrorState error={data.error} onRetry={data.reload} /></View> : d && data.data ? (
        <>
          {(d.pending_inspections > 0 || d.unanswered_messages > 0 || draft) ? (
            <>
              <Text style={s.h2}>Needs your attention</Text>
              <View style={s.list}>
                {d.pending_inspections > 0 ? <Attention icon={CalendarDays} tint="#FBEFD6" color={colors.fairText} title={`${d.pending_inspections} inspection ${d.pending_inspections === 1 ? 'request' : 'requests'}`} sub="Waiting for you to confirm" onPress={() => router.push('/inspections')} /> : null}
                {d.unanswered_messages > 0 ? <Attention icon={MessageSquare} tint={colors.navy100} color={colors.navy800} title={`${d.unanswered_messages} unanswered ${d.unanswered_messages === 1 ? 'message' : 'messages'}`} sub={d.oldest_unanswered_at ? `Oldest from ${timeAgo(d.oldest_unanswered_at)}` : ''} onPress={() => router.push('/messages')} /> : null}
                {draft ? <Attention icon={Camera} tint={colors.canvas} color={colors.muted} title="Finish your draft" sub={draft.title} onPress={() => router.push(`/listing-editor/${draft.id}`)} /> : null}
              </View>
            </>
          ) : null}

          <Text style={s.h2}>Your listings</Text>
          <View style={s.list}>
            {data.data.listings.length === 0 ? (
              <View style={s.empty}><Text style={s.emptyTitle}>No listings yet</Text><Text style={s.emptyBody}>Add your first home. We check every listing before renters see it.</Text></View>
            ) : data.data.listings.map((l) => {
              const st = STATUS[l.status];
              return (
                <Pressable key={l.id} onPress={() => (l.status === 'live' ? router.push(`/listing/${l.id}`) : edit(l))} style={s.card} accessibilityLabel={`${l.title}, ${st.label}`}>
                  <Photo uri={l.photos[0]} tint={l.id} label="" style={s.thumb} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={s.cardTitle} numberOfLines={2}>{l.title}</Text>
                    <Text style={s.cardSub}>{l.status === 'live' && l.stats ? `${l.stats.views} views · ${l.stats.saves} saves · ${l.stats.inquiries} inquiries` : `${st.when} ${timeAgo(l.updated_at)}`}</Text>
                    <Tag label={st.label} tone={st.tone} />
                  </View>
                  <Pressable onPress={() => menu(l)} hitSlop={12} accessibilityLabel="More options"><EllipsisVertical size={20} color={colors.muted} /></Pressable>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

function Tile({ value, label }: { value?: number; label: string }) {
  return <View style={s.tile}><Text style={s.tileNum}>{value ?? '–'}</Text><Text style={s.tileLabel}>{label}</Text></View>;
}

function Attention({ icon: Icon, tint, color, title, sub, onPress }: { icon: LucideIcon; tint: string; color: string; title: string; sub: string; onPress(): void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={s.attn}>
      <View style={[s.attnIcon, { backgroundColor: tint }]}><Icon size={22} color={color} strokeWidth={1.8} /></View>
      <View style={{ flex: 1 }}><Text style={s.attnTitle}>{title}</Text><Text style={s.attnSub} numberOfLines={2}>{sub}</Text></View>
      <ChevronRight size={20} color={colors.muted} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: colors.navy900, paddingHorizontal: space.xl, paddingBottom: space.xl },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  greet: { fontFamily: font.regular, fontSize: 18, color: '#D5DCEA' },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  verifiedText: { fontFamily: font.bold, fontSize: 16, color: colors.teal400 },
  unverified: { fontFamily: font.regular, fontSize: 14, color: '#9AA8C2', marginTop: 4 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 52, paddingHorizontal: 18, borderRadius: radius.card, backgroundColor: colors.teal400 },
  newText: { fontFamily: font.bold, fontSize: 16, color: colors.navy900 },
  tiles: { flexDirection: 'row', gap: space.sm, marginTop: space.xl },
  tile: { flex: 1, backgroundColor: '#FFFFFF14', borderRadius: radius.card, padding: space.lg, minHeight: 104, justifyContent: 'space-between' },
  tileNum: { fontFamily: font.extrabold, fontSize: 30, color: '#fff' },
  tileLabel: { fontFamily: font.regular, fontSize: 14, color: '#D5DCEA' },
  h2: { fontFamily: font.extrabold, fontSize: 22, color: colors.navy900, marginHorizontal: space.xl, marginTop: space.xl, marginBottom: space.md },
  list: { paddingHorizontal: space.lg, gap: space.md },
  attn: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: '#fff', borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.lg },
  attnIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  attnTitle: { fontFamily: font.bold, fontSize: 17, color: colors.navy900 },
  attnSub: { fontFamily: font.regular, fontSize: 14, color: colors.muted, marginTop: 2 },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: '#fff', borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.md },
  thumb: { width: 84, height: 84, borderRadius: radius.input },
  cardTitle: { fontFamily: font.bold, fontSize: 17, color: colors.navy900 },
  cardSub: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
  empty: { backgroundColor: '#fff', borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.xl },
  emptyTitle: { fontFamily: font.bold, fontSize: 17, color: colors.navy900 },
  emptyBody: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.muted, marginTop: 4 },
});
