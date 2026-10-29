import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListingCard } from '../../../components/ListingCard';
import { EmptyState, ErrorState, Loading } from '../../../components/States';
import { Button } from '../../../components/ui';
import { api } from '../../../lib/api';
import { useLoad } from '../../../lib/hooks';
import { useSaved } from '../../../lib/saved';
import { colors, font, space } from '../../../lib/theme';
import type { Listing } from '../../../lib/types';

export default function Saved() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { ids, toggle } = useSaved();
  const [picked, setPicked] = useState<number[]>([]);
  const data = useLoad(() => api<{ listings: Listing[] }>('/saved').then((r) => r.listings), [ids.size]);

  const pick = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 3 ? p : [...p, id]));
  const homes = (data.data ?? []).filter((l) => ids.has(l.id));

  return (
    <View style={{ flex: 1, paddingTop: top }}>
      <View style={s.head}>
        <Text style={s.title}>Saved homes</Text>
        <Text style={s.sub}>{homes.length > 1 ? 'Tap homes to select up to three, then compare them side by side.' : 'Your shortlist lives here.'}</Text>
      </View>
      {data.loading && !data.data ? <Loading /> : data.error && !data.data ? <ErrorState error={data.error} onRetry={data.reload} /> :
        homes.length === 0 ? <EmptyState title="Nothing saved yet" body="Tap the heart on a home to keep it here." action="Browse homes" onAction={() => router.push('/')} /> : (
          <>
            <FlatList data={homes} keyExtractor={(l) => String(l.id)} contentContainerStyle={{ padding: space.xl, gap: space.lg }}
              renderItem={({ item }) => (
                <ListingCard listing={item} saved onToggleSave={() => toggle(item.id)} selected={picked.includes(item.id)}
                  onSelect={picked.length > 0 ? () => pick(item.id) : undefined} />
              )} />
            <View style={s.bar}>
              <Button label={picked.length ? `Clear (${picked.length})` : 'Select to compare'} variant="outline" style={{ flex: 1 }}
                onPress={() => (picked.length ? setPicked([]) : homes[0] && pick(homes[0].id))} />
              <Button label="Compare" disabled={picked.length < 2} style={{ flex: 1 }} onPress={() => router.push(`/compare?ids=${picked.join(',')}`)} />
            </View>
          </>
        )}
    </View>
  );
}

const s = StyleSheet.create({
  head: { paddingHorizontal: space.xl, paddingTop: space.xl },
  title: { fontFamily: font.extrabold, fontSize: 30, color: colors.navy900, letterSpacing: -0.6 },
  sub: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.muted, marginTop: 4 },
  bar: { flexDirection: 'row', gap: space.md, padding: space.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line },
});
