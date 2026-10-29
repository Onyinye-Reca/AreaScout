import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Photo } from '../../../components/Photo';
import { EmptyState, ErrorState, Loading } from '../../../components/States';
import { Tag } from '../../../components/ui';
import { api } from '../../../lib/api';
import { naira, timeAgo } from '../../../lib/format';
import { useLoad } from '../../../lib/hooks';
import { colors, font, radius, space } from '../../../lib/theme';
import type { AdminListing } from '../../../lib/types';

export default function AdminListings() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const data = useLoad(() => api<{ listings: AdminListing[] }>('/admin/listings').then((r) => r.listings));
  return (
    <View style={{ flex: 1, paddingTop: top }}>
      <View style={{ paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space.md }}>
        <Text style={s.title}>Listings to review</Text>
        <Text style={s.sub}>Oldest first. Flagged ones need a closer look.</Text>
      </View>
      {data.loading && !data.data ? <Loading /> : data.error && !data.data ? <ErrorState error={data.error} onRetry={data.reload} /> : (
        <FlatList data={data.data ?? []} keyExtractor={(l) => String(l.id)} onRefresh={data.reload} refreshing={false}
          contentContainerStyle={{ padding: space.lg, gap: space.md, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState title="All caught up" body="New listings appear here for review before renters see them." />}
          renderItem={({ item: l }) => (
            <Pressable onPress={() => router.push(`/listing/${l.id}`)} style={s.card} accessibilityRole="button" accessibilityLabel={`Review ${l.title}`}>
              <Photo uri={l.photos[0]} tint={l.id} label="" style={s.thumb} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.cardTitle} numberOfLines={2}>{l.title}</Text>
                <Text style={s.cardSub} numberOfLines={1}>{l.owner_name} · {naira(l.rent)}/yr · {timeAgo(l.updated_at)}</Text>
                {l.flags.length ? l.flags.map((f) => <Tag key={f.type} label={f.detail} tone="fair" />) : <Tag label="New" tone="good" />}
              </View>
            </Pressable>
          )} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: font.extrabold, fontSize: 30, color: colors.navy900, letterSpacing: -0.6 },
  sub: { fontFamily: font.regular, fontSize: 15, color: colors.muted, marginTop: 4 },
  card: { flexDirection: 'row', gap: space.md, backgroundColor: '#fff', borderRadius: radius.card + 4, borderWidth: 1, borderColor: colors.line, padding: space.md },
  thumb: { width: 84, height: 84, borderRadius: radius.input },
  cardTitle: { fontFamily: font.bold, fontSize: 17, color: colors.navy900 },
  cardSub: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
});
