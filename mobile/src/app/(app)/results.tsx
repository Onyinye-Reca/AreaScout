import { useLocalSearchParams, useRouter } from 'expo-router';
import { SlidersHorizontal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { ListingCard } from '../../components/ListingCard';
import { EmptyState, ErrorState, Loading } from '../../components/States';
import { Chip, Header } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { summarise } from '../../lib/searches';
import { useLoad } from '../../lib/hooks';
import { useCity } from '../../lib/location';
import { useSaved } from '../../lib/saved';
import { colors, space } from '../../lib/theme';
import type { Listing } from '../../lib/types';

const SORTS = ['Recommended', 'Lowest rent', 'Move-in cost'] as const;

export default function Results() {
  const router = useRouter();
  const p = useLocalSearchParams<{ q?: string; type?: string; beds?: string; minRent?: string; maxRent?: string; verified?: string; area?: string }>();
  const { ids, toggle } = useSaved();
  const { city } = useCity();
  const { user } = useAuth();
  const [sort, setSort] = useState<(typeof SORTS)[number]>('Recommended');

  const query = new URLSearchParams();
  if (p.q) query.set('q', p.q);
  if (p.type) query.set('type', p.type);
  if (p.beds) query.set('beds', p.beds);
  if (p.minRent) query.set('min_rent', p.minRent);
  if (p.maxRent) query.set('max_rent', p.maxRent);
  if (p.verified) query.set('verified', p.verified);
  if (p.area) query.set('area', p.area);
  query.set('city', city); // an area slug belongs to one city, so this never narrows an area search wrongly
  const qs = query.toString();

  const data = useLoad(() => api<{ listings: Listing[] }>(`/listings${qs ? `?${qs}` : ''}`).then((r) => r.listings), [qs]);
  const sorted = useMemo(() => {
    const l = [...(data.data ?? [])];
    if (sort === 'Lowest rent') l.sort((a, b) => a.rent - b.rent);
    if (sort === 'Move-in cost') l.sort((a, b) => a.move_in_total - b.move_in_total);
    return l;
  }, [data.data, sort]);

  async function saveSearch() {
    const filters: Record<string, unknown> = { city };
    if (p.q) filters.q = p.q;
    if (p.type) filters.type = p.type;
    if (p.beds) filters.beds = Number(p.beds);
    if (p.minRent) filters.min_rent = Number(p.minRent);
    if (p.maxRent) filters.max_rent = Number(p.maxRent);
    if (p.verified) filters.verified = '1';
    if (p.area) filters.area = p.area;
    const name = summarise(filters as never).slice(0, 80) || `Homes in ${city}`;
    try {
      await api('/saved-searches', { method: 'POST', body: { name, filters } });
      Alert.alert('Search saved', 'Find it under Profile → Saved searches. We’ll count new homes that match.');
    } catch (e) { Alert.alert('Couldn’t save this search', errorMessage(e)); }
  }

  const filtered = qs.replace(/(^|&)city=[^&]*/, '').length > 0;
  return (
    <View style={{ flex: 1 }}>
      <Header title={p.q ? `“${p.q}”` : 'Homes'} subtitle={data.data ? `${sorted.length} ${sorted.length === 1 ? 'home' : 'homes'} in ${city}` : undefined}
        right={<Pressable onPress={() => router.push('/filters')} hitSlop={10} accessibilityLabel="Filters" style={s.filter}><SlidersHorizontal size={20} color={colors.navy900} strokeWidth={1.8} /></Pressable>} />
      {data.loading && !data.data ? <Loading /> : data.error && !data.data ? <ErrorState error={data.error} onRetry={data.reload} /> : (
        <FlatList data={sorted} keyExtractor={(l) => String(l.id)} onRefresh={data.reload} refreshing={false}
          contentContainerStyle={{ padding: space.xl, gap: space.lg, flexGrow: 1 }}
          ListHeaderComponent={(
            <View style={s.sorts}>
              {sorted.length > 1 ? SORTS.map((x) => <Chip key={x} label={x} on={sort === x} onPress={() => setSort(x)} />) : null}
              {user?.role === 'tenant' ? <Chip label="☆ Save search" onPress={saveSearch} /> : null}
            </View>
          )}
          ListEmptyComponent={<EmptyState title="No homes match" body={filtered ? 'Try a different area or loosen your filters.' : 'No homes are listed yet.'}
            action={filtered ? 'Clear filters' : undefined} onAction={() => router.replace('/results')} />}
          renderItem={({ item }) => <ListingCard listing={item} saved={ids.has(item.id)} onToggleSave={() => toggle(item.id)} />} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  filter: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.navy100, alignItems: 'center', justifyContent: 'center' },
  sorts: { flexDirection: 'row', gap: space.sm, marginBottom: space.xs, flexWrap: 'wrap' },
});
