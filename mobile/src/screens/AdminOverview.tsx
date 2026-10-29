import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DarkTile } from '../components/admin';
import { ReportCard } from '../components/ReportCard';
import { ErrorState, Loading } from '../components/States';
import { Tag } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { initials, timeAgo } from '../lib/format';
import { useLoad } from '../lib/hooks';
import { colors, font, radius, space } from '../lib/theme';
import type { AdminDashboard, AdminListing, ReportGroup } from '../lib/types';

export default function AdminOverview() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { user } = useAuth();
  const data = useLoad(async () => {
    const [dashboard, reports, listings] = await Promise.all([
      api<AdminDashboard>('/admin/dashboard'),
      api<{ reports: ReportGroup[] }>('/admin/reports'),
      api<{ listings: AdminListing[] }>('/admin/listings'),
    ]);
    return { dashboard, reports: reports.reports, listings: listings.listings };
  });
  const d = data.data?.dashboard;
  const urgent = (data.data?.reports ?? []).filter((r) => r.urgent);

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={data.reload} />} contentContainerStyle={{ paddingBottom: space.xxxl }}>
      <View style={[s.hero, { paddingTop: top + space.xl }]}>
        <View style={s.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>ADMIN · MODERATION</Text>
            <Text style={s.title}>Overview</Text>
          </View>
          <Pressable onPress={() => router.push('/profile')} accessibilityLabel="Your profile" style={s.avatar}><Text style={s.avatarText}>{initials(user?.name ?? 'A')}</Text></Pressable>
        </View>
        <View style={s.tiles}>
          <Pressable onPress={() => router.push('/reports')} style={s.tileWrap}><DarkTile value={d?.open_reports} label={d ? `Open reports${d.urgent_reports ? ` · ${d.urgent_reports} urgent` : ''}` : 'Open reports'} /></Pressable>
          <Pressable onPress={() => router.push('/listings')} style={s.tileWrap}><DarkTile value={d?.pending_listings} label="Listings to review" /></Pressable>
          <Pressable onPress={() => router.push('/area-moderation')} style={s.tileWrap}><DarkTile value={d?.pending_area_reviews} label="Area reviews to moderate" /></Pressable>
          <View style={s.tileWrap}><DarkTile value={d?.resolved_this_week} label="Resolved this week" accent /></View>
        </View>
      </View>

      {data.loading && !data.data ? <View style={{ height: 260 }}><Loading /></View> : data.error && !data.data ? <View style={{ height: 360 }}><ErrorState error={data.error} onRetry={data.reload} /></View> : data.data ? (
        <>
          <View style={s.head}><Text style={s.h2}>Urgent reports</Text>{data.data.reports.length > 0 ? <Text style={s.all} onPress={() => router.push('/reports')}>All {data.data.reports.length}</Text> : null}</View>
          <View style={s.list}>
            {urgent.length === 0 ? <Text style={s.none}>{data.data.reports.length ? 'Nothing urgent. Open reports are in the Reports tab.' : 'No open reports. Nice and quiet.'}</Text> : urgent.slice(0, 3).map((g) => <ReportCard key={g.listing_id} g={g} />)}
          </View>

          <View style={s.head}><Text style={s.h2}>Listings to review</Text>{data.data.listings.length > 3 ? <Text style={s.all} onPress={() => router.push('/listings')}>All {data.data.listings.length}</Text> : null}</View>
          {data.data.listings.length === 0 ? <View style={s.list}><Text style={s.none}>No listings waiting.</Text></View> : (
            <View style={s.group}>
              {data.data.listings.slice(0, 3).map((l, i) => (
                <Pressable key={l.id} onPress={() => router.push(`/listing/${l.id}`)} style={[s.row, i > 0 && s.rowBorder]} accessibilityRole="button">
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowTitle} numberOfLines={1}>{l.title}</Text>
                    <Text style={s.rowSub} numberOfLines={1}>{l.flags[0]?.detail ?? `${l.owner_name} · submitted ${timeAgo(l.updated_at)}`}</Text>
                  </View>
                  <Tag label={l.flags.length ? 'Auto-flagged' : 'New'} tone={l.flags.length ? 'neutral' : 'good'} />
                </Pressable>
              ))}
            </View>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: colors.navy900, paddingHorizontal: space.xl, paddingBottom: space.xl },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  eyebrow: { fontFamily: font.mono, fontSize: 13, letterSpacing: 1.5, color: colors.teal400 },
  title: { fontFamily: font.extrabold, fontSize: 34, color: '#fff', letterSpacing: -0.6 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.teal400, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: font.extrabold, fontSize: 18, color: colors.navy900 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.xl },
  tileWrap: { flexBasis: '47.5%', flexGrow: 1, flexDirection: 'row' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginHorizontal: space.xl, marginTop: space.xl, marginBottom: space.md },
  h2: { fontFamily: font.extrabold, fontSize: 22, color: colors.navy900 },
  all: { fontFamily: font.bold, fontSize: 16, color: colors.teal700, textDecorationLine: 'underline' },
  list: { paddingHorizontal: space.lg, gap: space.md },
  none: { fontFamily: font.regular, fontSize: 15, color: colors.muted },
  group: { marginHorizontal: space.lg, backgroundColor: '#fff', borderRadius: radius.card + 4, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  rowTitle: { fontFamily: font.bold, fontSize: 18, color: colors.navy900 },
  rowSub: { fontFamily: font.regular, fontSize: 15, color: colors.muted, marginTop: 2 },
});
