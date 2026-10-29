import { useRouter } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { EmptyState, ErrorState, Loading } from '../../../components/States';
import { Header } from '../../../components/ui';
import { api, errorMessage } from '../../../lib/api';
import { useLoad } from '../../../lib/hooks';
import { useCity } from '../../../lib/location';
import { summarise } from '../../../lib/searches';
import { colors, font, radius, space } from '../../../lib/theme';
import type { SavedSearch } from '../../../lib/types';

export default function SavedSearches() {
  const router = useRouter();
  const { setCity } = useCity();
  const data = useLoad(() => api<{ searches: SavedSearch[] }>('/saved-searches').then((r) => r.searches));

  function open(s: SavedSearch) {
    api(`/saved-searches/${s.id}/seen`, { method: 'POST' }).catch(() => {});
    if (s.filters.city) setCity(s.filters.city);
    const q = new URLSearchParams();
    const f = s.filters;
    if (f.q) q.set('q', f.q);
    if (f.type) q.set('type', f.type);
    if (f.beds) q.set('beds', String(f.beds));
    if (f.min_rent) q.set('minRent', String(f.min_rent));
    if (f.max_rent) q.set('maxRent', String(f.max_rent));
    if (f.verified) q.set('verified', '1');
    if (f.area) q.set('area', f.area);
    router.push(`/results?${q}`);
  }
  async function alerts(s: SavedSearch, value: boolean) {
    try { await api(`/saved-searches/${s.id}`, { method: 'PATCH', body: { alerts: value } }); data.reload(); }
    catch (e) { Alert.alert('Couldn’t update', errorMessage(e)); }
  }
  const remove = (s: SavedSearch) =>
    Alert.alert('Delete this search?', s.name, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { await api(`/saved-searches/${s.id}`, { method: 'DELETE' }); data.reload(); } catch (e) { Alert.alert('Couldn’t delete', errorMessage(e)); } } }]);

  return (
    <View style={{ flex: 1 }}>
      <Header title="Saved searches" />
      {data.loading && !data.data ? <Loading /> : data.error && !data.data ? <ErrorState error={data.error} onRetry={data.reload} /> : (
        <FlatList data={data.data ?? []} keyExtractor={(s) => String(s.id)} onRefresh={data.reload} refreshing={false} contentContainerStyle={{ padding: space.lg, gap: space.md, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState title="No saved searches" body="Search for homes, then tap “Save search” to see new matches here." />}
          renderItem={({ item: s }) => (
            <View style={st.card}>
              <Pressable onPress={() => open(s)} accessibilityRole="button" accessibilityLabel={`Open ${s.name}`}>
                <View style={st.top}>
                  <Text style={st.name} numberOfLines={1}>{s.name}</Text>
                  {s.new_count > 0 ? <View style={st.badge}><Text style={st.badgeText}>{s.new_count} new</Text></View> : null}
                </View>
                <Text style={st.sub}>{summarise(s.filters) || 'All homes'} · {s.match_count} {s.match_count === 1 ? 'match' : 'matches'}</Text>
              </Pressable>
              <View style={st.foot}>
                <View style={st.alert}><Text style={st.alertText}>Alert me</Text><Switch value={s.alerts} onValueChange={(v) => alerts(s, v)} trackColor={{ true: colors.teal500, false: colors.line }} /></View>
                <Text onPress={() => remove(s)} style={st.delete} accessibilityRole="button">Delete</Text>
              </View>
            </View>
          )} />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: radius.card + 2, borderWidth: 1, borderColor: colors.line, padding: space.lg, gap: space.md },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  name: { flex: 1, fontFamily: font.extrabold, fontSize: 18, color: colors.navy900 },
  badge: { backgroundColor: colors.teal500, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: '#fff', fontFamily: font.bold, fontSize: 13 },
  sub: { fontFamily: font.regular, fontSize: 15, color: colors.muted, marginTop: 2 },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  alert: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  alertText: { fontFamily: font.medium, fontSize: 15, color: colors.navy900 },
  delete: { fontFamily: font.bold, fontSize: 15, color: colors.poorText },
});
